import { describe, expect, it } from 'vitest';

import { requirementSchema } from './requirement';

describe('requirementSchema', () => {
  it('accepts a requirement with a condition and decision references', () => {
    const result = requirementSchema.safeParse({
      id: 'requirement.proof-of-address',
      title: 'Proof of address',
      description: 'A rental contract or property deed showing the new address.',
      appliesWhen: { kind: 'factTruthy', fact: 'household.hasNewAddress' },
      decisionReferenceIds: ['decision.municipal-address-change'],
    });
    expect(result.success).toBe(true);
  });

  it('defaults decisionReferenceIds to an empty array when omitted', () => {
    const result = requirementSchema.safeParse({
      id: 'requirement.proof-of-address',
      title: 'Proof of address',
      description: 'A rental contract or property deed showing the new address.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decisionReferenceIds).toEqual([]);
    }
  });

  it('rejects a requirement with an invalid nested condition', () => {
    const result = requirementSchema.safeParse({
      id: 'requirement.proof-of-address',
      title: 'Proof of address',
      description: 'A rental contract or property deed showing the new address.',
      appliesWhen: { kind: 'factGreaterThan', fact: 'household.income', value: 100 },
    });
    expect(result.success).toBe(false);
  });
});
