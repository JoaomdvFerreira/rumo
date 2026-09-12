import type {
  AliasDefinition,
  IntentCandidate,
  IntentCatalog,
  IntentConfidence,
} from '../model/intent';
import type { FactSet } from '../model/fact';

/** Lowest score that may become a candidate; weaker overlap is unsupported. */
export const INTENT_ACCEPTANCE_THRESHOLD = 80;

/**
 * Normalize presentation only: case, diacritics, punctuation and whitespace.
 * This intentionally performs no stemming, edit-distance, or semantic guessing.
 */
export function normalizeIntentText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('pt-PT')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenizeIntentText(value: string): string[] {
  const normalized = normalizeIntentText(value);
  return normalized === '' ? [] : normalized.split(' ');
}

function containsTokenPhrase(
  input: readonly string[],
  phrase: readonly string[],
): boolean {
  if (phrase.length === 0 || phrase.length > input.length) return false;
  for (let start = 0; start <= input.length - phrase.length; start += 1) {
    if (phrase.every((token, offset) => input[start + offset] === token)) {
      return true;
    }
  }
  return false;
}

interface ScoredAlias {
  readonly alias: AliasDefinition;
  readonly score: number;
  readonly confidence: IntentConfidence;
}

function scoreAlias(
  inputTokens: readonly string[],
  alias: AliasDefinition,
): ScoredAlias | undefined {
  const aliasTokens = tokenizeIntentText(alias.phrase);
  if (!containsTokenPhrase(inputTokens, aliasTokens)) return undefined;

  const exact = inputTokens.length === aliasTokens.length;
  // A one-token phrase is accepted only as the entire query. This prevents a
  // generic word embedded in unrelated text from producing a weak candidate.
  if (!exact && aliasTokens.length < 2) return undefined;

  const score = (exact ? 100 : 80) + Math.min(aliasTokens.length, 20);
  return { alias, score, confidence: exact ? 'high' : 'medium' };
}

const confidenceRank: Readonly<Record<IntentConfidence, number>> = {
  high: 2,
  medium: 1,
};

function compareCandidates(
  left: IntentCandidate,
  right: IntentCandidate,
): number {
  return (
    right.score - left.score ||
    confidenceRank[right.confidence] - confidenceRank[left.confidence] ||
    compareIds(left.destinationId, right.destinationId) ||
    compareIds(left.evidence.aliasId, right.evidence.aliasId)
  );
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function copyFacts(facts: FactSet | undefined): FactSet {
  return Object.fromEntries(
    Object.entries(facts ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : value,
    ]),
  );
}

/** Deterministically match input against declarative, token-bounded phrases. */
export function matchIntents(
  input: string,
  catalog: IntentCatalog,
): IntentCandidate[] {
  const inputTokens = tokenizeIntentText(input);
  if (inputTokens.length === 0) return [];

  const candidatesByDestination = new Map<string, IntentCandidate>();
  for (const intent of catalog) {
    for (const alias of intent.aliases) {
      const match = scoreAlias(inputTokens, alias);
      if (!match || match.score < INTENT_ACCEPTANCE_THRESHOLD) continue;

      const candidate: IntentCandidate = {
        destinationId: intent.destinationId,
        score: match.score,
        confidence: match.confidence,
        evidence: {
          intentId: intent.id,
          aliasId: alias.id,
          kind: alias.kind,
          phrase: alias.phrase,
        },
        facts: copyFacts(alias.extractedFacts),
      };
      const existing = candidatesByDestination.get(intent.destinationId);
      if (!existing || compareCandidates(candidate, existing) < 0) {
        candidatesByDestination.set(intent.destinationId, candidate);
      }
    }
  }

  return [...candidatesByDestination.values()].sort(compareCandidates);
}
