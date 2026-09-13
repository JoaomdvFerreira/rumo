import { describe, expect, it } from 'vitest';

import { sourceDefinitionSchema, sourceVerificationSchema } from './source';

describe('sourceDefinitionSchema', () => {
  it('accepts a well-formed authoritative source', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'https://www.cm-evora.pt',
      jurisdiction: 'Évora',
      kind: 'action',
      freshnessRisk: 'low',
      supports: ['requirement.proof-of-address'],
      caution: 'Confirm office hours before visiting in person.',
    });
    expect(result.success).toBe(true);
  });

  it('defaults supports to an empty array when omitted', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'https://www.cm-evora.pt',
      jurisdiction: 'Évora',
      kind: 'evidence',
      freshnessRisk: 'medium',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.supports).toEqual([]);
    }
  });

  it('rejects a non-URL value for url', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'not-a-url',
      jurisdiction: 'Évora',
      kind: 'action',
      freshnessRisk: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a kind outside the closed enum', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'https://www.cm-evora.pt',
      jurisdiction: 'Évora',
      kind: 'primary',
      freshnessRisk: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a mutable verification field on a definition (fields kept separate)', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'https://www.cm-evora.pt',
      jurisdiction: 'Évora',
      kind: 'action',
      freshnessRisk: 'low',
      linkHealth: 'ok',
    });
    expect(result.success).toBe(false);
  });
});

describe('sourceVerificationSchema', () => {
  it('accepts a well-formed verification record with optional observations', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
      linkHealth: 'ok',
      contentFreshness: 'current',
      httpStatus: 200,
      finalUrl: 'https://www.cm-evora.pt/',
      contentHash: 'sha256:abc123',
      contentReviewedAt: '2026-01-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a verification record without optional observation fields', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
      linkHealth: 'broken',
      contentFreshness: 'unknown',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a linkHealth value outside the closed enum', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
      linkHealth: 'probably-fine',
      contentFreshness: 'current',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a contentFreshness value outside the closed enum', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
      linkHealth: 'ok',
      contentFreshness: 'fresh',
    });
    expect(result.success).toBe(false);
  });

  it('rejects the removed generic status field', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
      linkHealth: 'ok',
      contentFreshness: 'current',
      status: 'verified',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO checkedAt', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      checkedAt: 'yesterday',
      checkedBy: 'content-team',
      linkHealth: 'ok',
      contentFreshness: 'current',
    });
    expect(result.success).toBe(false);
  });
});
