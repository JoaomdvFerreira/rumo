import { describe, expect, it } from 'vitest';

import { requirementGroupSchema, requirementSchema } from './requirement';

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

  it('rejects a requirement with an unexpected extra key', () => {
    const result = requirementSchema.safeParse({
      id: 'requirement.proof-of-address',
      title: 'Proof of address',
      description: 'A rental contract or property deed showing the new address.',
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });
});

describe('requirementGroupSchema', () => {
  it('accepts a valid allOf group', () => {
    const result = requirementGroupSchema.safeParse({
      id: 'requirementGroup.identity-proof',
      mode: 'allOf',
      requirementIds: ['requirement.proof-of-address', 'requirement.proof-of-identity'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid anyOf group', () => {
    const result = requirementGroupSchema.safeParse({
      id: 'requirementGroup.contact-method',
      mode: 'anyOf',
      requirementIds: ['requirement.phone-number', 'requirement.email-address'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty requirementIds array', () => {
    const result = requirementGroupSchema.safeParse({
      id: 'requirementGroup.identity-proof',
      mode: 'allOf',
      requirementIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown mode', () => {
    const result = requirementGroupSchema.safeParse({
      id: 'requirementGroup.identity-proof',
      mode: 'exactlyOne',
      requirementIds: ['requirement.proof-of-address'],
    });
    expect(result.success).toBe(false);
  });
});
