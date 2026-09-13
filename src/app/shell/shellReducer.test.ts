import { describe, expect, it } from 'vitest';

import { initialShellState, shellReducer } from './shellReducer';
import { createSessionFromCandidate } from './sessionState';
import type { IntentCandidate } from '../../domain/model/intent';

const candidate: IntentCandidate = {
  destinationId: 'destination.j01-settle-new-address',
  score: 100,
  confidence: 'high',
  evidence: { intentId: 'intent.j01-moving-home', aliasId: 'alias.j01-launch-label', kind: 'alias', phrase: 'Mudar de casa' },
  facts: {},
};

const secondCandidateForSession: IntentCandidate = {
  destinationId: 'destination.j02-energy-connected',
  score: 100,
  confidence: 'high',
  evidence: { intentId: 'intent.j02-energy', aliasId: 'alias.j02-launch-label', kind: 'alias', phrase: 'Eletricidade e gás na nova casa' },
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

  it('accepts a legitimate sessionRestored on an untouched initial intentEntry', () => {
    const restoredSession = createSessionFromCandidate(candidate, '2025-12-01T00:00:00.000Z');

    const state = shellReducer(initialShellState(undefined, undefined), {
      type: 'sessionRestored',
      session: restoredSession,
      notice: undefined,
    });

    expect(state.phase.kind).toBe('active');
    expect(state.session).toBe(restoredSession);
    expect(state.hasUserInteracted).toBe(false);
  });
});

/**
 * F6 remediation (Project Overseer review of WU007/C007): the reducer-level
 * regression proving the hydration/reset race is closed. `hasUserInteracted`
 * must be the guard, not `phase.kind === 'intentEntry'` -- an explicit
 * `reset` also lands on `intentEntry`, so relying on phase alone would let a
 * late `sessionRestored` reactivate a session the user had already
 * explicitly reset away from.
 */
describe('shellReducer F6: late hydration must never undo prior user interaction/reset', () => {
  it('a late sessionRestored after interaction + reset must NOT reactivate the stale persisted session', () => {
    // 1. Initial shell state.
    const initial = initialShellState(undefined, undefined);
    expect(initial.phase.kind).toBe('intentEntry');
    expect(initial.hasUserInteracted).toBe(false);

    // 2. User starts a supported scenario/session.
    const afterScenario = shellReducer(initial, {
      type: 'searchSubmitted',
      query: 'Mudar de casa',
      candidates: [candidate],
      source: 'scenario',
      now,
    });
    expect(afterScenario.phase.kind).toBe('active');
    expect(afterScenario.hasUserInteracted).toBe(true);

    // 3. User dispatches reset.
    const afterReset = shellReducer(afterScenario, { type: 'reset' });
    expect(afterReset.phase.kind).toBe('intentEntry');
    expect(afterReset.session).toBeUndefined();
    expect(afterReset.hasUserInteracted).toBe(true);

    // 4. A late sessionRestored action arrives with an old persisted session.
    const staleSessionA = createSessionFromCandidate(secondCandidateForSession, '2025-01-01T00:00:00.000Z');
    const afterLateRestoration = shellReducer(afterReset, {
      type: 'sessionRestored',
      session: staleSessionA,
      notice: 'stale restoration notice',
    });

    // 5. Result MUST remain intentEntry with no active session.
    expect(afterLateRestoration.phase.kind).toBe('intentEntry');
    expect(afterLateRestoration.session).toBeUndefined();
    expect(afterLateRestoration).toBe(afterReset);
  });

  it('untouched initial intentEntry still accepts a legitimate sessionRestored', () => {
    const initial = initialShellState(undefined, undefined);
    const restoredSession = createSessionFromCandidate(candidate, '2025-06-01T00:00:00.000Z');

    const state = shellReducer(initial, {
      type: 'sessionRestored',
      session: restoredSession,
      notice: 'restored notice',
    });

    expect(state.phase.kind).toBe('active');
    expect(state.session).toBe(restoredSession);
    expect(state.restorationNotice).toBe('restored notice');
  });

  it('the existing "late hydration while already past intentEntry (no reset)" case still remains ignored', () => {
    const afterSearch = shellReducer(initialShellState(undefined, undefined), {
      type: 'searchSubmitted',
      query: 'preciso de eletricidade e internet',
      candidates: [candidate, secondCandidateForSession],
      source: 'search',
      now,
    });
    expect(afterSearch.phase.kind).toBe('candidates');

    const staleSession = createSessionFromCandidate(secondCandidateForSession, '2025-01-01T00:00:00.000Z');
    const afterLateRestoration = shellReducer(afterSearch, {
      type: 'sessionRestored',
      session: staleSession,
      notice: undefined,
    });

    expect(afterLateRestoration).toBe(afterSearch);
  });

  it('reset after hydration has already been consumed continues to behave as before', () => {
    // Hydration resolves first (no persisted session), consumed while still
    // untouched -- ordinary, non-late sessionRestored.
    const afterHydration = shellReducer(initialShellState(undefined, undefined), {
      type: 'sessionRestored',
      session: undefined,
      notice: undefined,
    });
    expect(afterHydration.phase.kind).toBe('intentEntry');
    expect(afterHydration.hasUserInteracted).toBe(false);

    // User starts and then resets a session as normal, with no further
    // hydration event involved.
    const afterScenario = shellReducer(afterHydration, {
      type: 'searchSubmitted',
      query: 'Mudar de casa',
      candidates: [candidate],
      source: 'scenario',
      now,
    });
    const afterReset = shellReducer(afterScenario, { type: 'reset' });

    expect(afterReset.phase.kind).toBe('intentEntry');
    expect(afterReset.session).toBeUndefined();
    expect(afterReset.restorationNotice).toBeUndefined();
  });
});
