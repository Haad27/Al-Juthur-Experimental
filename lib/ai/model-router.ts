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
  'gemini-3.0-flash': { name: 'gemini-3.0-flash', apiName: 'gemini-3.0-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemini-2.5-flash': { name: 'gemini-2.5-flash', apiName: 'gemini-2.5-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemini-3.5-flash': { name: 'gemini-3.5-flash', apiName: 'gemini-3.5-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemini-3.6-flash': { name: 'gemini-3.6-flash', apiName: 'gemini-3.6-flash', maxRpm: 5, maxWeeklyTokens: 250000 },
  'gemma-4-26b': { name: 'gemma-4-26b', apiName: 'gemma-4-26b', maxRpm: 30, maxWeeklyTokens: 16000 },
  'gemma-4-31b': { name: 'gemma-4-31b', apiName: 'gemma-4-31b', maxRpm: 30, maxWeeklyTokens: 16000 },
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
          generationConfig: { temperature: 0.2, maxOutputTokens: 2500 } // Low temp for academic precision
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
