import { describe, expect, it } from 'vitest';

import { intentCatalog } from '../../content/intents';
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
