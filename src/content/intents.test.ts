import { describe, expect, it } from 'vitest';

import { canonicalContent, contentHash } from './index';
import { computeContentHash } from './hash';
import { checkIntentCatalog, intentCatalog } from './intents';

describe('intent catalog', () => {
  it('resolves every alias intent to a canonical Destination', () => {
    expect(
      checkIntentCatalog(intentCatalog, canonicalContent.destinations),
    ).toEqual([]);
  });

  it('rejects a dangling alias intent target', () => {
    const invalidCatalog = [
      {
        id: 'intent.invalid',
        destinationId: 'destination.missing',
        aliases: [
          {
            id: 'alias.invalid',
            phrase: 'missing destination',
            kind: 'alias' as const,
          },
        ],
      },
    ];
    expect(
      checkIntentCatalog(invalidCatalog, canonicalContent.destinations),
    ).toEqual([
      {
        kind: 'danglingDestination',
        id: 'intent.invalid',
        detail: 'references unknown destination "destination.missing"',
      },
    ]);
  });

  it('keeps search aliases outside the routing content hash', () => {
    const editedSearchCopy = intentCatalog.map((intent) => ({
      ...intent,
      aliases: [...intent.aliases],
    }));
    editedSearchCopy[0]?.aliases.push({
      id: 'alias.j01-copy-only',
      phrase: 'new search wording',
      kind: 'alias',
    });

    expect('intents' in canonicalContent).toBe(false);
    expect(computeContentHash(canonicalContent)).toBe(contentHash);
  });
});
