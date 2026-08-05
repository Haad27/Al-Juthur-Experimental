import { checkModelCapacity, logUsage } from './quota-manager';
import { calculateCreditCost, estimateTokens } from './token-budget';

interface AIModelConfig {
  name: string;
  maxRpm: number;
  maxWeeklyTokens: number;
  apiName: string;
}

// ----------------------------------------------------
// MODEL REGISTRY & LIMITS (Google AI Studio)
// ----------------------------------------------------
export const AVAILABLE_MODELS: Record<string, AIModelConfig> = {
  'gemini-3.1-flash-lite': { name: 'gemini-3.1-flash-lite', apiName: 'gemini-3.1-flash-lite', maxRpm: 15, maxWeeklyTokens: 250000 },
  'gemini-3.5-flash-lite': { name: 'gemini-3.5-flash-lite', apiName: 'gemini-3.5-flash-lite', maxRpm: 15, maxWeeklyTokens: 250000 },
  'gemini-2.5-flash-lite': { name: 'gemini-2.5-flash-lite', apiName: 'gemini-2.5-flash-lite', maxRpm: 10, maxWeeklyTokens: 250000 },
  'gemini-3.0-flash': { name: 'gemini-3.0-flash', apiName: 'gemini-3-flash-preview', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemini-2.5-flash': { name: 'gemini-2.5-flash', apiName: 'gemini-2.5-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemini-3.5-flash': { name: 'gemini-3.5-flash', apiName: 'gemini-3.5-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemini-3.6-flash': { name: 'gemini-3.6-flash', apiName: 'gemini-3.6-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemma-4-26b': { name: 'gemma-4-26b', apiName: 'gemma-4-26b-a4b-it', maxRpm: 30, maxWeeklyTokens: 16000 },
  'gemma-4-31b': { name: 'gemma-4-31b', apiName: 'gemma-4-31b-it', maxRpm: 30, maxWeeklyTokens: 16000 },
};

// ----------------------------------------------------
// MODE-SPECIFIC ROUTING CHAINS
// ----------------------------------------------------
export const ROUTING_CHAINS: Record<string, string[]> = {
  'default': ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'],
  'lexicon': ['gemini-3.5-flash-lite', 'gemma-4-26b', 'gemini-2.5-flash-lite'],
  'modern': ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.0-flash'],
  'grammar': ['gemini-3.0-flash', 'gemini-2.5-flash', 'gemma-4-31b'],
  'classical': ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-3.0-flash'],
  'philosophical': ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'],
  'translate_short': ['gemma-4-31b', 'gemma-4-26b', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash'],
  'translate_long': ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash'],
};

interface ExecutionResult {
  text: string;
  modelUsed: string;
}

/**
 * Attempts to execute a prompt across the mode's model chain.
 * Handles rate limits, capacity checks, and fallback execution.
 */
export async function executeWithFallback(
  mode: string, 
  systemPrompt: string, 
  userPrompt: string, 
  identifier: string,
  estimatedTotalTokens: number
): Promise<ExecutionResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set.");

  const chain = ROUTING_CHAINS[mode] || ROUTING_CHAINS['default'];

  for (const modelId of chain) {
    const config = AVAILABLE_MODELS[modelId];
    if (!config) continue;

    // 1. Check Model Capacity (RPM & Weekly)
    const hasCapacity = await checkModelCapacity(config.name, estimatedTotalTokens, config.maxRpm, config.maxWeeklyTokens);
    if (!hasCapacity) {
      console.warn(`[ROUTER] Skipping ${config.name} due to RPM or Weekly limit hit.`);
      continue;
    }

    // 2. Call the Model
    try {
      console.log(`[ROUTER] Executing on ${config.name}...`);
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.apiName}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER INQUIRY: ${userPrompt}` }] }
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 } // Low temp for academic precision
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`API Error ${res.status}: ${JSON.stringify(errData)}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const apiPromptTokens = data.usageMetadata?.promptTokenCount || estimateTokens(systemPrompt + userPrompt);
      const apiCompletionTokens = data.usageMetadata?.candidatesTokenCount || estimateTokens(text || '');

      if (text) {
        // 3. Log Usage exactly via dynamic credits
        const actualUsage = calculateCreditCost(apiPromptTokens, apiCompletionTokens);
        await logUsage(identifier, config.name, actualUsage);
        
        return { text, modelUsed: config.name };
      }
    } catch (e) {
      console.warn(`[ROUTER] Model ${config.name} failed:`, e);
      // Let it continue to the next fallback model
    }
  }

  throw new Error("All models in the fallback chain were exhausted or failed. Please try again later.");
}

/**
 * Executes a prompt across the mode's model chain with streaming support.
 * Returns a custom ReadableStream that yields text chunks (SSE) and handles quota logging internally.
 */
export async function executeWithFallbackStream(
  mode: string, 
  systemPrompt: string, 
  userPrompt: string, 
  identifier: string,
  estimatedTotalTokens: number
): Promise<{ stream: ReadableStream, modelUsed: string }> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set.");

  const chain = ROUTING_CHAINS[mode] || ROUTING_CHAINS['default'];

  for (const modelId of chain) {
    const config = AVAILABLE_MODELS[modelId];
    if (!config) continue;

    const hasCapacity = await checkModelCapacity(config.name, estimatedTotalTokens, config.maxRpm, config.maxWeeklyTokens);
    if (!hasCapacity) {
      console.warn(`[ROUTER] Skipping ${config.name} due to RPM or Weekly limit hit.`);
      continue;
    }

    try {
      console.log(`[ROUTER-STREAM] Executing on ${config.name}...`);
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.apiName}:streamGenerateContent?alt=sse&key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER INQUIRY: ${userPrompt}` }] }
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`API Error ${res.status}: ${JSON.stringify(errData)}`);
      }
      if (!res.body) throw new Error("No response body");

      // Intercept the stream to parse text and log usage
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let apiPromptTokens = estimateTokens(systemPrompt + userPrompt);
      let apiCompletionTokens = 0;
      let fullText = "";

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || "";
              
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.replace("data: ", "").trim();
                  if (!dataStr) continue;
                  try {
                    const data = JSON.parse(dataStr);
                    const chunkText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunkText) {
                      fullText += chunkText;
                      // Encode chunk directly as an SSE event for the client
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`));
                    }
                    if (data.usageMetadata) {
                      if (data.usageMetadata.promptTokenCount) apiPromptTokens = data.usageMetadata.promptTokenCount;
                      if (data.usageMetadata.candidatesTokenCount) apiCompletionTokens = data.usageMetadata.candidatesTokenCount;
                    }
                  } catch (e) {
                    // Ignore incomplete JSON chunks from SSE
                  }
                }
              }
            }
            if (!apiCompletionTokens) {
               apiCompletionTokens = estimateTokens(fullText);
            }
            // Log usage dynamically after stream completes
            const actualUsage = calculateCreditCost(apiPromptTokens, apiCompletionTokens);
            await logUsage(identifier, config.name, actualUsage);
            
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return { stream, modelUsed: config.name };
    } catch (e) {
      console.warn(`[ROUTER-STREAM] Model ${config.name} failed:`, e);
      // Let it continue to the next fallback model
    }
  }

  throw new Error("All models in the fallback chain were exhausted or failed. Please try again later.");
}
