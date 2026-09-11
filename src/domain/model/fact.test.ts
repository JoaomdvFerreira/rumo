import { describe, expect, it } from 'vitest';

import { factSetSchema } from './fact';

describe('factSetSchema', () => {
  it('accepts a valid FactSet with scalar and array values', () => {
    const result = factSetSchema.safeParse({
      'household.municipality': 'Evora',
      'household.hasNewAddress': true,
      'household.movers': 2,
      'services.selected': ['electricity', 'gas'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty FactSet', () => {
    const result = factSetSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects a fact value that is an executable function', () => {
    const result = factSetSchema.safeParse({
      'household.municipality': () => 'Evora',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a fact value that is a nested object', () => {
    const result = factSetSchema.safeParse({
      'household.address': { street: 'Rua Principal' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a fact value that is null', () => {
    const result = factSetSchema.safeParse({
      'household.municipality': null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an array fact value with mixed unsupported element types', () => {
    const result = factSetSchema.safeParse({
      'services.selected': ['electricity', { nested: true }],
    });
    expect(result.success).toBe(false);
  });

  it('represents an unknown fact by absence rather than a placeholder value', () => {
    const result = factSetSchema.safeParse({ 'household.municipality': 'Evora' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('household.unknownFact' in result.data).toBe(false);
    }
  });
});
