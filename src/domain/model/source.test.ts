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
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-URL value for url', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'not-a-url',
      jurisdiction: 'Évora',
    });
    expect(result.success).toBe(false);
  });

  it('does not accept verification fields as part of a definition', () => {
    const result = sourceDefinitionSchema.safeParse({
      id: 'source.cme-evora',
      title: 'Câmara Municipal de Évora',
      publisher: 'Câmara Municipal de Évora',
      url: 'https://www.cm-evora.pt',
      jurisdiction: 'Évora',
      status: 'verified',
    });
    // Zod object schemas ignore unknown keys by default; assert the parsed
    // shape has no verification concept, keeping the two contracts separate.
    expect(result.success && 'status' in result.data).toBe(false);
  });
});

describe('sourceVerificationSchema', () => {
  it('accepts a well-formed verification record', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      status: 'verified',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a status outside the closed enum', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      status: 'probably-fine',
      checkedAt: '2026-01-15T10:00:00.000Z',
      checkedBy: 'content-team',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO checkedAt', () => {
    const result = sourceVerificationSchema.safeParse({
      sourceId: 'source.cme-evora',
      status: 'verified',
      checkedAt: 'yesterday',
      checkedBy: 'content-team',
    });
    expect(result.success).toBe(false);
  });
});
