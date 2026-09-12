import { describe, expect, it } from 'vitest';

import { initialShellState, shellReducer } from './shellReducer';
import type { IntentCandidate } from '../../domain/model/intent';

const candidate: IntentCandidate = {
  destinationId: 'destination.j01-settle-new-address',
  score: 100,
  confidence: 'high',
  evidence: { intentId: 'intent.j01-moving-home', aliasId: 'alias.j01-launch-label', kind: 'alias', phrase: 'Mudar de casa' },
  facts: {},
};

const now = '2026-01-01T00:00:00.000Z';

describe('shellReducer searchSubmitted (F4: single-result typed search requires explicit confirmation)', () => {
  it('shows an explicit singleResult confirmation for a single typed-search match, without creating a session', () => {
    const state = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'Mudar de casa',
      candidates: [candidate],
      source: 'search',
      now,
    });

    expect(state.phase.kind).toBe('singleResult');
    expect(state.session).toBeUndefined();
  });

  it('continues directly to an active session for a single scenario-button match', () => {
    const state = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'Mudar de casa',
      candidates: [candidate],
      source: 'scenario',
      now,
    });

    expect(state.phase.kind).toBe('active');
    expect(state.session?.rootDestinationId).toBe(candidate.destinationId);
  });

  it('creates the session only after candidateSelected is dispatched from the singleResult phase', () => {
    const afterSearch = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'Mudar de casa',
      candidates: [candidate],
      source: 'search',
      now,
    });
    expect(afterSearch.session).toBeUndefined();

    const afterContinue = shellReducer(afterSearch, { type: 'candidateSelected', candidate, now });
    expect(afterContinue.phase.kind).toBe('active');
    expect(afterContinue.session?.rootDestinationId).toBe(candidate.destinationId);
  });

  it('still shows the multi-candidate picker for more than one match regardless of source', () => {
    const secondCandidate: IntentCandidate = { ...candidate, destinationId: 'destination.j02-energy-connected' };
    const state = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'preciso de eletricidade e internet',
      candidates: [candidate, secondCandidate],
      source: 'search',
      now,
    });

    expect(state.phase.kind).toBe('candidates');
  });

  it('still shows the unsupported outcome for zero matches regardless of source', () => {
    const state = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'algo nao suportado',
      candidates: [],
      source: 'search',
      now,
    });

    expect(state.phase.kind).toBe('unsupported');
  });
});

describe('shellReducer sessionRestored', () => {
  it('does not clobber a phase the user has already moved past intentEntry into', () => {
    const afterSearch = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'Mudar de casa',
      candidates: [candidate],
      source: 'search',
      now,
    });

    const afterLateRestoration = shellReducer(afterSearch, {
      type: 'sessionRestored',
      session: undefined,
      notice: undefined,
    });

    expect(afterLateRestoration).toBe(afterSearch);
  });
});
