import { encode } from "gpt-tokenizer";

export function countTokens(text: string | null | undefined): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    // Rough fallback if tokenizer encounters unexpected characters: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}

export function calculateSlidingBudget(params: {
  modelContextLimit: number;
  reserveTokens: number;
  systemOverhead: number;
}): number {
  const { modelContextLimit, reserveTokens, systemOverhead } = params;
  // Add a 10% safety buffer for tokenizer discrepancies between models (e.g. GPT vs Llama)
  const safetyBuffer = Math.floor(modelContextLimit * 0.1);
  const available = modelContextLimit - reserveTokens - systemOverhead - safetyBuffer;
  return Math.max(available, 500); // Guarantee minimum 500 tokens for immediate context
}
