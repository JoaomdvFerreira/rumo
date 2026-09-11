import { describe, expect, it } from 'vitest';

import { decisionReferenceSchema } from './decision';

describe('decisionReferenceSchema', () => {
  it('accepts a decision reference with a citation and multiple sources', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceIds: ['source.cme-evora', 'source.diario-republica'],
      summary: 'Residents must register an address change within 60 days.',
      citation: 'Regulamento Municipal, Art. 12',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a decision reference without a citation', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceIds: ['source.cme-evora'],
      summary: 'Residents must register an address change within 60 days.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a decision reference with an empty sourceIds array', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceIds: [],
      summary: 'Residents must register an address change within 60 days.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a decision reference missing sourceIds', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      summary: 'Residents must register an address change within 60 days.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects the legacy singular sourceId field', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceId: 'source.cme-evora',
      summary: 'Residents must register an address change within 60 days.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unexpected extra key', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceIds: ['source.cme-evora'],
      summary: 'Residents must register an address change within 60 days.',
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });
});
