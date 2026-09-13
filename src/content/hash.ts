import { createHash } from 'node:crypto';

import type { ContentGraph } from './graph';

/**
 * Deterministic content hashing (docs/governance/versioning.md,
 * docs/architecture/guardrails.md): the hash must depend only on the
 * canonical content values, never on object key insertion order or array
 * declaration order artifacts that aren't semantically meaningful. Keys are
 * sorted recursively before serialization so two structurally-equal graphs
 * always hash identically regardless of how they were assembled, while
 * array element order is preserved because it is semantically meaningful
 * (see priority.ts: declaration order is a real tie-break input).
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

export function canonicalContentString(content: ContentGraph): string {
  return JSON.stringify(canonicalize(content));
}

export function computeContentHash(content: ContentGraph): string {
  return createHash('sha256')
    .update(canonicalContentString(content))
    .digest('hex');
}
