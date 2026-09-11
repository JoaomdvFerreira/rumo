import { describe, expect, it } from 'vitest';

import { decisionReferenceSchema } from './decision';

describe('decisionReferenceSchema', () => {
  it('accepts a decision reference with a citation', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceId: 'source.cme-evora',
      summary: 'Residents must register an address change within 60 days.',
      citation: 'Regulamento Municipal, Art. 12',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a decision reference without a citation', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      sourceId: 'source.cme-evora',
      summary: 'Residents must register an address change within 60 days.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a decision reference missing a sourceId', () => {
    const result = decisionReferenceSchema.safeParse({
      id: 'decision.municipal-address-change',
      summary: 'Residents must register an address change within 60 days.',
    });
    expect(result.success).toBe(false);
  });
});
