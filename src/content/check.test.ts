import { describe, expect, it } from 'vitest';

import { canonicalContent, contentHash } from './index';
import { computeContentHash } from './hash';
import { checkContentGraph } from './validate';

/**
 * `pnpm content:check`: fails the moment the representative canonical
 * content graph has a duplicate id, dangling reference, invalid condition,
 * missing source verification, or an unresolved stale high-freshness-risk
 * source. Run via Vitest (see package.json) rather than a standalone
 * script, since the project has no ts-node/tsx runner and this reuses
 * existing, already-approved tooling instead of adding one.
 */
describe('content:check', () => {
  it('representative content validates with no cross-reference, condition, or freshness issues', () => {
    const issues = checkContentGraph(canonicalContent);
    expect(issues).toEqual([]);
  });

  it('content hash is deterministic across repeated computation', () => {
    expect(computeContentHash(canonicalContent)).toBe(contentHash);
    expect(computeContentHash(canonicalContent)).toBe(computeContentHash(canonicalContent));
  });

  it('content hash is deterministic regardless of object key order', () => {
    const reordered = {
      ...canonicalContent,
      sources: canonicalContent.sources.map((source) => {
        const entries = Object.entries(source).reverse();
        return Object.fromEntries(entries) as typeof source;
      }),
    };
    expect(computeContentHash(reordered)).toBe(contentHash);
  });
});
