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

function findTokenPhraseStart(
  input: readonly string[],
  phrase: readonly string[],
): number {
  if (phrase.length === 0 || phrase.length > input.length) return -1;
  for (let start = 0; start <= input.length - phrase.length; start += 1) {
    if (phrase.every((token, offset) => input[start + offset] === token)) {
      return start;
    }
  }
  return -1;
}

/**
 * Bounded set of local negators that flip a positive alias match. This is a
 * fixed lexical list, not generative NLP: it only rejects a match when a
 * negator appears within NEGATION_WINDOW tokens immediately before the
 * matched phrase, so unrelated negation elsewhere in the input is ignored.
 */
const NEGATION_TOKENS = new Set([
  'nao',
  'nunca',
  'sem',
  'not',
  'never',
  'without',
]);

const NEGATION_WINDOW = 3;

function isLocallyNegated(
  input: readonly string[],
  matchStart: number,
): boolean {
  const windowStart = Math.max(0, matchStart - NEGATION_WINDOW);
  for (let index = windowStart; index < matchStart; index += 1) {
    if (NEGATION_TOKENS.has(input[index] ?? '')) return true;
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
  const matchStart = findTokenPhraseStart(inputTokens, aliasTokens);
  if (matchStart < 0) return undefined;
  if (isLocallyNegated(inputTokens, matchStart)) return undefined;

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

function factValueKey(value: FactSet[string]): string {
  return JSON.stringify(value);
}

/**
 * Merge facts explicitly extracted by every accepted alias belonging to one
 * Destination. Identical values for the same key are kept; if two accepted
 * aliases disagree on a key's value, that key is omitted entirely rather
 * than resolved by score, order, or alias id -- an unknown fact is safer
 * than a guessed one.
 */
function aggregateFacts(factSets: readonly (FactSet | undefined)[]): FactSet {
  const valuesByKey = new Map<string, Set<string>>();
  const firstValueByKey = new Map<string, FactSet[string]>();

  for (const facts of factSets) {
    for (const [key, value] of Object.entries(facts ?? {})) {
      const seen = valuesByKey.get(key) ?? new Set<string>();
      seen.add(factValueKey(value));
      valuesByKey.set(key, seen);
      if (!firstValueByKey.has(key)) firstValueByKey.set(key, value);
    }
  }

  const aggregated: FactSet = {};
  for (const [key, seenValues] of valuesByKey) {
    if (seenValues.size > 1) continue;
    const value = firstValueByKey.get(key);
    aggregated[key] = Array.isArray(value) ? [...value] : (value as FactSet[string]);
  }
  return aggregated;
}

interface AcceptedMatch {
  readonly alias: AliasDefinition;
  readonly candidate: IntentCandidate;
}

/** Deterministically match input against declarative, token-bounded phrases. */
export function matchIntents(
  input: string,
  catalog: IntentCatalog,
): IntentCandidate[] {
  const inputTokens = tokenizeIntentText(input);
  if (inputTokens.length === 0) return [];

  const acceptedByDestination = new Map<string, AcceptedMatch[]>();
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
        facts: {},
      };
      const accepted = acceptedByDestination.get(intent.destinationId) ?? [];
      accepted.push({ alias, candidate });
      acceptedByDestination.set(intent.destinationId, accepted);
    }
  }

  const candidates: IntentCandidate[] = [];
  for (const accepted of acceptedByDestination.values()) {
    const strongest = accepted
      .map((entry) => entry.candidate)
      .reduce((best, current) =>
        compareCandidates(current, best) < 0 ? current : best,
      );
    const facts = aggregateFacts(
      accepted.map((entry) => entry.alias.extractedFacts),
    );
    candidates.push({ ...strongest, facts });
  }

  return candidates.sort(compareCandidates);
}
