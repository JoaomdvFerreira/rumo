import { describe, expect, it } from 'vitest';

import { isNonEmptyLabel } from './foundation';

describe('isNonEmptyLabel', () => {
  it('rejects whitespace-only labels', () => {
    expect(isNonEmptyLabel('   ')).toBe(false);
  });

  it('accepts a meaningful label', () => {
    expect(isNonEmptyLabel('Rumo')).toBe(true);
  });
});
