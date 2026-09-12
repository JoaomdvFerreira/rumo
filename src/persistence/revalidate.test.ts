import { describe, expect, it } from 'vitest';

import { revalidateEnvelope, revalidateSession } from './revalidate';
import type { RevalidationContentIndex } from './revalidate';
import { CURRENT_SCHEMA_VERSION } from './schema';
import type { PersistedSession, PersistedStateEnvelope } from './schema';

function contentIndex(overrides: Partial<RevalidationContentIndex> = {}): RevalidationContentIndex {
  return {
    destinationIds: new Set(['dest-root']),
    stepIds: new Set(['step-a', 'step-b']),
    requirementIds: new Set(['req-a']),
    ...overrides,
  };
}

function session(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return {
    id: 'session-1',
    rootDestinationId: 'dest-root',
    facts: {},
    progress: {
      manualCompletedStepIds: ['step-a'],
      externalOutcomeCompletedStepIds: [],
      satisfiedRequirementIds: ['req-a'],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('revalidateSession', () => {
  it('preserves progress whose ids still exist in current content', () => {
    const result = revalidateSession(session(), contentIndex());

    expect(result.session?.progress).toEqual({
      manualCompletedStepIds: ['step-a'],
      externalOutcomeCompletedStepIds: [],
      satisfiedRequirementIds: ['req-a'],
    });
    expect(result.discardedStepIds).toEqual([]);
    expect(result.discardedRequirementIds).toEqual([]);
  });

  it('drops step ids that no longer exist in current content rather than trusting them', () => {
    const stale = session({
      progress: {
        manualCompletedStepIds: ['step-a', 'step-removed'],
        externalOutcomeCompletedStepIds: ['step-also-removed'],
        satisfiedRequirementIds: ['req-a'],
      },
    });

    const result = revalidateSession(stale, contentIndex());

    expect(result.session?.progress.manualCompletedStepIds).toEqual(['step-a']);
    expect(result.session?.progress.externalOutcomeCompletedStepIds).toEqual([]);
    expect([...result.discardedStepIds].sort()).toEqual(['step-also-removed', 'step-removed']);
  });

  it('drops requirement ids that no longer exist in current content', () => {
    const stale = session({ progress: { manualCompletedStepIds: [], externalOutcomeCompletedStepIds: [], satisfiedRequirementIds: ['req-a', 'req-removed'] } });

    const result = revalidateSession(stale, contentIndex());

    expect(result.session?.progress.satisfiedRequirementIds).toEqual(['req-a']);
    expect(result.discardedRequirementIds).toEqual(['req-removed']);
  });

  it('discards the whole session when its root Destination no longer exists', () => {
    const orphaned = session({ rootDestinationId: 'dest-deleted' });

    const result = revalidateSession(orphaned, contentIndex());

    expect(result.session).toBeUndefined();
    expect(result.discardedStepIds).toEqual([]);
    expect(result.discardedRequirementIds).toEqual([]);
  });

  it('preserves parent and subjourney step progress together across a round trip', () => {
    // Root/subjourney progress shares one flat progress set (runtime.ts):
    // a step id from a child Destination's route survives revalidation the
    // same way a root-level step id does, because both are just step ids
    // checked against the same current-content index.
    const withSubjourneyProgress = session({
      progress: {
        manualCompletedStepIds: ['step-a'],
        externalOutcomeCompletedStepIds: ['step-b'],
        satisfiedRequirementIds: ['req-a'],
      },
    });

    const result = revalidateSession(withSubjourneyProgress, contentIndex());

    expect(result.session?.progress.manualCompletedStepIds).toContain('step-a');
    expect(result.session?.progress.externalOutcomeCompletedStepIds).toContain('step-b');
  });
});

describe('revalidateEnvelope', () => {
  function envelope(overrides: Partial<PersistedStateEnvelope> = {}): PersistedStateEnvelope {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      contentVersion: 'hash-old',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sessions: [session()],
      ...overrides,
    };
  }

  it('leaves the envelope untouched when contentVersion matches current content', () => {
    const current = envelope({ contentVersion: 'hash-current' });

    const result = revalidateEnvelope(current, 'hash-current', contentIndex(), '2026-03-01T00:00:00.000Z');

    expect(result.changed).toBe(false);
    expect(result.envelope).toBe(current);
    expect(result.discardedSessionIds).toEqual([]);
  });

  it('revalidates every session and stamps the current contentVersion on mismatch', () => {
    const stale = envelope({ contentVersion: 'hash-old' });

    const result = revalidateEnvelope(stale, 'hash-new', contentIndex(), '2026-03-01T00:00:00.000Z');

    expect(result.changed).toBe(true);
    expect(result.envelope.contentVersion).toBe('hash-new');
    expect(result.envelope.updatedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(result.envelope.sessions).toHaveLength(1);
  });

  it('removes sessions whose root Destination no longer exists during mismatch revalidation', () => {
    const stale = envelope({
      contentVersion: 'hash-old',
      sessions: [session({ id: 'keep' }), session({ id: 'drop', rootDestinationId: 'dest-deleted' })],
    });

    const result = revalidateEnvelope(stale, 'hash-new', contentIndex(), '2026-03-01T00:00:00.000Z');

    expect(result.envelope.sessions.map((s) => s.id)).toEqual(['keep']);
    expect(result.discardedSessionIds).toEqual(['drop']);
  });

  it('never lets a stale session bypass revalidation and stay under the old contentVersion', () => {
    const stale = envelope({ contentVersion: 'hash-old' });

    const result = revalidateEnvelope(stale, 'hash-new', contentIndex({ stepIds: new Set() }), '2026-03-01T00:00:00.000Z');

    expect(result.envelope.contentVersion).toBe('hash-new');
    // step-a no longer resolves under the tightened content index, so it
    // must not survive as trusted progress just because the session was
    // otherwise kept.
    expect(result.envelope.sessions[0]?.progress.manualCompletedStepIds).toEqual([]);
  });
});
