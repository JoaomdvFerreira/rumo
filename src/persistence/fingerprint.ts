import { createHash } from 'node:crypto';

import type { Requirement } from '../domain/model/requirement';
import type { Step } from '../domain/model/step';

/**
 * Deterministic semantic fingerprint for a progress-bearing entity (F1
 * remediation). A bare surviving id is not proof that previously recorded
 * completion/satisfaction is still valid: the same id can persist while its
 * applicability, requirement/dependency wiring, or completion mode changes
 * entirely under a content update. A fingerprint captures exactly the
 * fields that determine whether "this id was completed/satisfied" still
 * means the same thing. The comparison is intentionally conservative:
 * every canonical field except the stable id participates, including copy
 * that may describe a changed obligation to the user.
 *
 * Canonicalization mirrors src/content/hash.ts (recursively sort object
 * keys; preserve array order) so the same logical shape always fingerprints
 * identically regardless of declaration order.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

export function fingerprintSemanticValue(semanticShape: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(semanticShape))).digest('hex');
}

/**
 * The entity-local semantic surface for a Step. `contentIndex.ts` combines
 * this with Route, RouteVariant, and Destination placement so routing or
 * reachability changes under the same id also change the persisted token.
 */
export function stepFingerprint(step: Step): string {
  const { id: _id, ...semanticShape } = step;
  return fingerprintSemanticValue(semanticShape);
}

/**
 * The entity-local semantic surface for a Requirement. `contentIndex.ts`
 * combines this with group, Step, and routing placement, so changed wiring
 * cannot silently reuse an old satisfaction.
 */
export function requirementFingerprint(requirement: Requirement): string {
  const { id: _id, ...semanticShape } = requirement;
  return fingerprintSemanticValue(semanticShape);
}
