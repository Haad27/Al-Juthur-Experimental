/**
 * Gemini Models & Dynamic Token Credit Budget System
 * 
 * ============================================================================
 * OFFICIAL GEMINI MODEL RATE LIMITS (Free Tier vs. Pay-As-You-Go)
 * ============================================================================
 * Model Name             | RPM (Req/Min) | TPM (Tokens/Min) | RPD (Req/Day)
 * ----------------------------------------------------------------------------
 * Gemini 2.5 Flash       | 15 RPM        | 1,000,000 TPM    | 1,500 RPD
 * Gemini 2.5 Pro         | 2 RPM         | 32,000 TPM       | 50 RPD
 * Gemini 2.0 Flash       | 15 RPM        | 1,000,000 TPM    | 1,500 RPD
 * Gemini 1.5 Flash       | 15 RPM        | 1,000,000 TPM    | 1,500 RPD
 * Gemini 1.5 Pro         | 2 RPM         | 32,000 TPM       | 50 RPD
 * ============================================================================
 * 
 * DYNAMIC CREDIT FORMULA (How Companies Limit Users Fairly):
 * 
 * Instead of fixed "N requests/day", users are given a Daily Credit Allowance (e.g. 50,000 credits/day).
 * 
 * Formula:
 *   Credits Consumed = (Prompt_Tokens * Weight_In) + (Response_Tokens * Weight_Out)
 * 
 * Standard Weights (LLM Output generation is ~3-4x more expensive):
 *   Weight_In  = 1 credit  per prompt token
 *   Weight_Out = 3 credits per response token
 */

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsConsumed: number;
}

export const WEIGHT_INPUT = 1;
export const WEIGHT_OUTPUT = 3;
export const DEFAULT_DAILY_CREDITS = 50000; // e.g. 50,000 free tokens/credits per user per day

/**
 * Fast character-based token estimator (1 token ≈ 4 characters or ~0.75 words)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculates dynamic credit cost from exact or estimated tokens.
 */
export function calculateCreditCost(promptTokens: number, completionTokens: number): TokenUsage {
  const creditsConsumed = (promptTokens * WEIGHT_INPUT) + (completionTokens * WEIGHT_OUTPUT);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    creditsConsumed,
  };
}

/**
 * Example Token Bucket Rate Limiter check for Dynamic Free Quotas
 */
export function checkDynamicCreditLimit(
  userCreditsUsed: number,
  estimatedPromptTokens: number,
  dailyCreditAllowance: number = DEFAULT_DAILY_CREDITS
): { allowed: boolean; remainingCredits: number; estimatedCost: number } {
  const minEstimatedCost = calculateCreditCost(estimatedPromptTokens, 250).creditsConsumed;
  const remainingCredits = Math.max(0, dailyCreditAllowance - userCreditsUsed);

  return {
    allowed: remainingCredits >= minEstimatedCost,
    remainingCredits,
    estimatedCost: minEstimatedCost,
  };
}
