/**
 * Observability & Regeneration Telemetry Service
 * Tracks generation metrics, calculates lexical & structural similarity,
 * and detects repetitive / verbatim assistant responses.
 */

export interface GenerationMetrics {
  sessionId: string;
  characterName: string;
  orderIndex: number;
  isRegeneration: boolean;
  swipeNumber?: number;
  durationMs: number;
  promptLength: number;
  outputLength: number;
  similarityScore?: number;
  openingActionMatch?: boolean;
}

/**
 * Tokenize string into lowercase alphanumeric word set for fast Jaccard overlap
 */
export function getWordSet(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Calculate Jaccard similarity between two text responses (0.0 to 1.0)
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const setA = getWordSet(textA);
  const setB = getWordSet(textB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Extract opening physical / roleplay action clause (e.g. *chuckles softly and leans back*)
 */
export function extractOpeningAction(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^\*([^*]+)\*/);
  return match ? match[1].toLowerCase().trim() : null;
}

/**
 * Check if two roleplay responses have an identical or near-identical opening action
 */
export function hasDuplicateOpeningAction(textA: string, textB: string): boolean {
  const actionA = extractOpeningAction(textA);
  const actionB = extractOpeningAction(textB);
  if (!actionA || !actionB) return false;
  return actionA === actionB || actionA.includes(actionB) || actionB.includes(actionA);
}

/**
 * Log structured generation telemetry to console
 */
export function logGenerationMetrics(metrics: GenerationMetrics): void {
  const typeLabel = metrics.isRegeneration
    ? `🔄 REGENERATE (Swipe #${metrics.swipeNumber || 1})`
    : `✨ GENERATE`;

  let similarityStr = "";
  if (metrics.isRegeneration && typeof metrics.similarityScore === "number") {
    const pct = Math.round(metrics.similarityScore * 100);
    const badge = pct > 80 ? "⚠️ HIGH SIMILARITY" : pct > 60 ? "MODERATE" : "✓ DISTINCT";
    similarityStr = ` | Similarity: ${pct}% [${badge}]`;
    if (metrics.openingActionMatch) {
      similarityStr += " (Opening Action Matched)";
    }
  }

  console.log(
    `📊 [Observability] ${typeLabel} with "${metrics.characterName}" | Turn #${metrics.orderIndex} | ${metrics.durationMs}ms | In: ${metrics.promptLength} chars | Out: ${metrics.outputLength} chars${similarityStr}`
  );
}
