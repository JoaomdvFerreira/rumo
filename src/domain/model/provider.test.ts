import { describe, expect, it } from 'vitest';

import { channelSchema, providerSchema } from './provider';

describe('channelSchema', () => {
  it('accepts an online channel with a url', () => {
    const result = channelSchema.safeParse({
      id: 'channel.cme-evora-online',
      type: 'online',
      label: 'Portal do Munícipe',
      url: 'https://www.cm-evora.pt/portal',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an in-person channel without a url', () => {
    const result = channelSchema.safeParse({
      id: 'channel.cme-evora-desk',
      type: 'inPerson',
      label: 'Balcão Único',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a channel type outside the closed enum', () => {
    const result = channelSchema.safeParse({
      id: 'channel.cme-evora-carrier-pigeon',
      type: 'carrierPigeon',
      label: 'Pombo-correio',
    });
    expect(result.success).toBe(false);
  });
});

describe('providerSchema', () => {
  it('accepts a provider with at least one channel', () => {
    const result = providerSchema.safeParse({
      id: 'provider.cme-evora',
      name: 'Câmara Municipal de Évora',
      jurisdiction: 'Évora',
      sourceId: 'source.cme-evora',
      channels: [{ id: 'channel.cme-evora-desk', type: 'inPerson', label: 'Balcão Único' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a provider with zero channels', () => {
    const result = providerSchema.safeParse({
      id: 'provider.cme-evora',
      name: 'Câmara Municipal de Évora',
      jurisdiction: 'Évora',
      sourceId: 'source.cme-evora',
      channels: [],
    });
    expect(result.success).toBe(false);
  });
});
