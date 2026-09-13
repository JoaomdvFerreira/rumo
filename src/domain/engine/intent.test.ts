import { describe, expect, it } from 'vitest';

import { intentCatalog } from '../../content/intents';
import type { IntentCatalog } from '../model/intent';
import {
  INTENT_ACCEPTANCE_THRESHOLD,
  matchIntents,
  normalizeIntentText,
  tokenizeIntentText,
} from './intent';

describe('intent normalization', () => {
  it('normalizes case, Portuguese diacritics, punctuation, and repeated whitespace', () => {
    expect(normalizeIntentText('  Évora,   GÁS!!! ')).toBe('evora gas');
    expect(normalizeIntentText('Évora')).toBe(normalizeIntentText('evora'));
    expect(normalizeIntentText('GÁS')).toBe(normalizeIntentText('gas'));
    expect(tokenizeIntentText(' mudar---de\t casa ')).toEqual([
      'mudar',
      'de',
      'casa',
    ]);
  });
});

describe('deterministic intent matching', () => {
  it.each([
    [
      'Settle into your new address',
      'destination.j01-settle-new-address',
      'alias.j01-canonical-title',
    ],
    [
      'Get electricity and gas connected',
      'destination.j02-energy-connected',
      'alias.j02-canonical-title',
    ],
    [
      'Get internet connected',
      'destination.j03-internet-connected',
      'alias.j03-canonical-title',
    ],
  ])('matches canonical title %s', (title, destinationId, aliasId) => {
    const [candidate] = matchIntents(title, intentCatalog);
    expect(candidate).toMatchObject({
      destinationId,
      confidence: 'high',
      evidence: { kind: 'intent', aliasId },
      facts: {},
    });
    expect(candidate?.score).toBeGreaterThan(INTENT_ACCEPTANCE_THRESHOLD);
  });

  it('resolves two aliases for one intent to the same canonical Destination', () => {
    const moving = matchIntents('moving home', intentCatalog);
    const settling = matchIntents('settling into a new home', intentCatalog);
    expect(moving).toHaveLength(1);
    expect(settling).toHaveLength(1);
    expect(moving[0]?.destinationId).toBe('destination.j01-settle-new-address');
    expect(settling[0]?.destinationId).toBe(moving[0]?.destinationId);
  });

  it('matches aliases without regard to case, accents, punctuation, or whitespace', () => {
    const candidates = matchIntents(
      '  ENTREI numa casa arrendada em EVORA!!!  ',
      intentCatalog,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      destinationId: 'destination.j01-settle-new-address',
      evidence: { aliasId: 'alias.j01-evora-rental' },
      facts: { 'household.municipality': 'evora' },
    });
  });

  it('extracts only municipality from the Évora rented-home alias', () => {
    const [candidate] = matchIntents(
      'Entrei numa casa arrendada em Évora',
      intentCatalog,
    );
    expect(candidate?.facts).toEqual({ 'household.municipality': 'evora' });
    expect(candidate?.facts).not.toHaveProperty('household.hasCitizenCard');
    expect(candidate?.facts).not.toHaveProperty('household.hasGasConnection');
    expect(candidate?.facts).not.toHaveProperty(
      'household.wantsToKeepPhoneNumber',
    );
  });

  it('extracts number portability only when explicitly requested', () => {
    const explicit = matchIntents(
      'Mudar de operador de internet e manter o meu número de telefone',
      intentCatalog,
    );
    expect(explicit[0]).toMatchObject({
      destinationId: 'destination.j03-internet-connected',
      facts: { 'household.wantsToKeepPhoneNumber': true },
    });

    const ordinary = matchIntents('instalar internet', intentCatalog);
    expect(ordinary[0]?.facts).toEqual({});
  });

  it('extracts an existing gas connection only from explicit wording', () => {
    expect(
      matchIntents('já tenho ligação de gás', intentCatalog)[0]?.facts,
    ).toEqual({ 'household.hasGasConnection': true });
    expect(matchIntents('contratar gás', intentCatalog)[0]?.facts).toEqual({});
  });

  it('returns no candidate for unsupported, fuzzy, partial, or generic overlap', () => {
    expect(matchIntents('renovar o passaporte', intentCatalog)).toEqual([]);
    expect(matchIntents('internete', intentCatalog)).toEqual([]);
    expect(
      matchIntents('internet banking para a empresa', intentCatalog),
    ).toEqual([]);
    expect(matchIntents('gastronomia em Évora', intentCatalog)).toEqual([]);
  });

  it('uses token boundaries instead of unrelated substrings', () => {
    expect(matchIntents('desligar a eletricidade', intentCatalog)).toEqual([]);
    expect(matchIntents('quero reinstalar internet', intentCatalog)).toEqual(
      [],
    );
  });

  it('returns ambiguous supported candidates in stable canonical order', () => {
    const input = 'preciso de eletricidade e internet';
    const expected = [
      'destination.j02-energy-connected',
      'destination.j03-internet-connected',
    ];
    for (let execution = 0; execution < 20; execution += 1) {
      const candidates = matchIntents(input, intentCatalog);
      expect(candidates.map(({ destinationId }) => destinationId)).toEqual(
        expected,
      );
      expect(candidates[0]?.score).toBe(candidates[1]?.score);
    }
  });

  it('is independent of catalog declaration order', () => {
    const input = 'preciso de eletricidade e internet';
    expect(matchIntents(input, [...intentCatalog].reverse())).toEqual(
      matchIntents(input, intentCatalog),
    );
  });
});

describe('fact aggregation across accepted aliases', () => {
  const input = 'preciso de eletricidade e internet e já tenho ligação de gás';

  it('aggregates facts from every accepted alias for the same Destination', () => {
    const candidates = matchIntents(input, intentCatalog);
    const j02 = candidates.find(
      (candidate) =>
        candidate.destinationId === 'destination.j02-energy-connected',
    );
    const j03 = candidates.find(
      (candidate) =>
        candidate.destinationId === 'destination.j03-internet-connected',
    );

    expect(j02).toBeDefined();
    expect(j02?.facts).toEqual({ 'household.hasGasConnection': true });

    expect(j03).toBeDefined();
    expect(j03?.facts).not.toHaveProperty('household.hasGasConnection');
  });

  it('is independent of catalog declaration order', () => {
    expect(matchIntents(input, [...intentCatalog].reverse())).toEqual(
      matchIntents(input, intentCatalog),
    );
  });

  it('does not let a stronger generic alias suppress another accepted alias fact', () => {
    const [j02] = matchIntents(
      'já tenho ligação de gás e preciso de eletricidade e internet',
      intentCatalog,
    ).filter(
      (candidate) =>
        candidate.destinationId === 'destination.j02-energy-connected',
    );
    expect(j02?.facts).toEqual({ 'household.hasGasConnection': true });
  });

  it('omits a fact key when accepted aliases for the same Destination disagree', () => {
    const conflictingCatalog: IntentCatalog = [
      {
        id: 'intent.conflict',
        destinationId: 'destination.j02-energy-connected',
        aliases: [
          {
            id: 'alias.conflict-a',
            phrase: 'contratar gás',
            kind: 'alias',
            extractedFacts: { 'household.hasGasConnection': true },
          },
          {
            id: 'alias.conflict-b',
            phrase: 'ligar a eletricidade',
            kind: 'alias',
            extractedFacts: { 'household.hasGasConnection': false },
          },
        ],
      },
    ];

    const [candidate] = matchIntents(
      'contratar gás e ligar a eletricidade',
      conflictingCatalog,
    );
    expect(candidate).toBeDefined();
    expect(candidate?.facts).not.toHaveProperty('household.hasGasConnection');
  });
});

describe('locally negated phrases', () => {
  it.each([
    'não quero instalar internet',
    'não vou mudar de casa',
    'não quero contratar gás',
  ])('rejects a positive alias inside a local negation: %s', (input) => {
    expect(matchIntents(input, intentCatalog)).toEqual([]);
  });

  it.each(['quero instalar internet', 'vou mudar de casa', 'quero contratar gás'])(
    'still matches the positive form: %s',
    (input) => {
      expect(matchIntents(input, intentCatalog)).not.toEqual([]);
    },
  );
});

describe('frozen Portuguese launch labels', () => {
  it.each([
    ['Mudar de casa', 'destination.j01-settle-new-address'],
    ['Eletricidade e gás na nova casa', 'destination.j02-energy-connected'],
    ['Internet numa mudança', 'destination.j03-internet-connected'],
  ])('matches launch label %s', (label, destinationId) => {
    const candidates = matchIntents(label, intentCatalog);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ destinationId, facts: {} });
  });

  it('matches launch labels without regard to case, accents, or punctuation', () => {
    const candidates = matchIntents(
      '  ELETRICIDADE e GÁS,   na NOVA casa!!!  ',
      intentCatalog,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.destinationId).toBe(
      'destination.j02-energy-connected',
    );
  });
});
