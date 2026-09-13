import { describe, expect, it } from 'vitest';

import { selectMostRecentSession } from './sessionState';
import type { PersistedSession } from '../../persistence/schema';

function session(id: string, updatedAt: string): PersistedSession {
  return {
    id,
    rootDestinationId: 'destination.j01-settle-new-address',
    facts: {},
    progress: {
      manualCompletedStepIds: [],
      externalOutcomeCompletedStepIds: [],
      satisfiedRequirementIds: [],
    },
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('selectMostRecentSession', () => {
  it('returns undefined for an empty list', () => {
    expect(selectMostRecentSession([])).toBeUndefined();
  });

  it('returns the only session when there is one', () => {
    const only = session('session.a', '2026-01-01T00:00:00.000Z');
    expect(selectMostRecentSession([only])).toBe(only);
  });

  it('selects the newer session even when it is second in the array', () => {
    const older = session('session.older', '2026-01-01T00:00:00.000Z');
    const newer = session('session.newer', '2026-06-01T00:00:00.000Z');
    expect(selectMostRecentSession([older, newer])).toBe(newer);
  });

  it('gives the same result when the array order is reversed', () => {
    const older = session('session.older', '2026-01-01T00:00:00.000Z');
    const newer = session('session.newer', '2026-06-01T00:00:00.000Z');
    expect(selectMostRecentSession([newer, older])).toBe(newer);
  });

  it('breaks equal-timestamp ties deterministically by id', () => {
    const a = session('session.a', '2026-01-01T00:00:00.000Z');
    const b = session('session.b', '2026-01-01T00:00:00.000Z');
    expect(selectMostRecentSession([a, b])).toBe(b);
    expect(selectMostRecentSession([b, a])).toBe(b);
  });

  it('selects the most recent among more than two sessions regardless of order', () => {
    const first = session('session.first', '2026-01-01T00:00:00.000Z');
    const middle = session('session.middle', '2026-03-01T00:00:00.000Z');
    const latest = session('session.latest', '2026-09-01T00:00:00.000Z');
    expect(selectMostRecentSession([first, latest, middle])).toBe(latest);
    expect(selectMostRecentSession([latest, middle, first])).toBe(latest);
    expect(selectMostRecentSession([middle, first, latest])).toBe(latest);
  });
});
