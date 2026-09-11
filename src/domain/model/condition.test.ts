import { describe, expect, it } from 'vitest';

import { conditionSchema } from './condition';

describe('conditionSchema', () => {
  it('accepts a leaf factEquals condition', () => {
    const result = conditionSchema.safeParse({
      kind: 'factEquals',
      fact: 'household.municipality',
      value: 'Evora',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a nested allOf/anyOf/not composition', () => {
    const result = conditionSchema.safeParse({
      kind: 'allOf',
      conditions: [
        { kind: 'factTruthy', fact: 'household.hasNewAddress' },
        {
          kind: 'not',
          condition: { kind: 'factPresent', fact: 'household.previousMunicipality' },
        },
        {
          kind: 'anyOf',
          conditions: [
            { kind: 'factIn', fact: 'household.energyProvider', values: ['edp', 'galp'] },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown operator kind (closed operator set)', () => {
    const result = conditionSchema.safeParse({
      kind: 'factGreaterThan',
      fact: 'household.income',
      value: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an executable callback payload', () => {
    const result = conditionSchema.safeParse({
      kind: 'factEquals',
      fact: 'household.municipality',
      value: () => true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty allOf conditions array', () => {
    const result = conditionSchema.safeParse({ kind: 'allOf', conditions: [] });
    expect(result.success).toBe(false);
  });
});
