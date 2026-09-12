import { describe, expect, it } from 'vitest';

import { revalidateEnvelope, revalidateSession } from './revalidate';
import type { RevalidationContentIndex } from './revalidate';
import { CURRENT_SCHEMA_VERSION } from './schema';
import type { PersistedSession, PersistedStateEnvelope } from './schema';

const step = (id: string, fingerprint = `fp-${id}`) => ({ id, fingerprint });
const requirement = (id: string, fingerprint = `fp-${id}`) => ({ id, fingerprint });

function contentIndex(overrides: Partial<RevalidationContentIndex> = {}): RevalidationContentIndex {
  return {
    destinationIds: new Set(['dest-root', 'dest-child']),
    stepFingerprints: new Map([
      ['step-a', 'fp-step-a'],
      ['step-b', 'fp-step-b'],
    ]),
    requirementFingerprints: new Map([['req-a', 'fp-req-a']]),
    reachableStepIdsByDestination: new Map([
      ['dest-root', new Set(['step-a', 'step-b'])],
      ['dest-child', new Set(['step-b'])],
    ]),
    reachableRequirementIdsByDestination: new Map([
      ['dest-root', new Set(['req-a'])],
      ['dest-child', new Set<string>()],
    ]),
    ...overrides,
  };
}

function session(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return {
    id: 'session-1',
    rootDestinationId: 'dest-root',
    facts: { 'household.size': 2 },
    progress: {
      manualCompletedStepIds: [step('step-a')],
      externalOutcomeCompletedStepIds: [],
      satisfiedRequirementIds: [requirement('req-a')],
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('revalidateSession', () => {
  it('preserves same-id progress when its semantic fingerprint is unchanged', () => {
    const result = revalidateSession(session(), contentIndex());

    expect(result.session?.progress).toEqual(session().progress);
    expect(result.discardedStepIds).toEqual([]);
    expect(result.discardedRequirementIds).toEqual([]);
  });

  it('discards a same-id Step completion when current semantics changed', () => {
    const result = revalidateSession(
      session(),
      contentIndex({ stepFingerprints: new Map([['step-a', 'changed-step-semantics']]) }),
    );

    expect(result.session?.progress.manualCompletedStepIds).toEqual([]);
    expect(result.discardedStepIds).toEqual(['step-a']);
  });

  it('discards a same-id Requirement satisfaction when current semantics changed', () => {
    const result = revalidateSession(
      session(),
      contentIndex({ requirementFingerprints: new Map([['req-a', 'changed-requirement-semantics']]) }),
    );

    expect(result.session?.progress.satisfiedRequirementIds).toEqual([]);
    expect(result.discardedRequirementIds).toEqual(['req-a']);
  });

  it('does not trust a globally existing Step that is no longer reachable from the session root', () => {
    const result = revalidateSession(
      session(),
      contentIndex({ reachableStepIdsByDestination: new Map([['dest-root', new Set(['step-b'])]]) }),
    );

    expect(result.session?.progress.manualCompletedStepIds).toEqual([]);
    expect(result.discardedStepIds).toEqual(['step-a']);
  });

  it('continues to discard removed ids', () => {
    const stale = session({
      progress: {
        manualCompletedStepIds: [step('step-removed')],
        externalOutcomeCompletedStepIds: [],
        satisfiedRequirementIds: [requirement('req-removed')],
      },
    });

    const result = revalidateSession(stale, contentIndex());
    expect(result.session?.progress).toEqual({
      manualCompletedStepIds: [],
      externalOutcomeCompletedStepIds: [],
      satisfiedRequirementIds: [],
    });
    expect(result.discardedStepIds).toEqual(['step-removed']);
    expect(result.discardedRequirementIds).toEqual(['req-removed']);
  });

  it('discards the whole session when its root Destination was deleted', () => {
    const result = revalidateSession(
      session({ rootDestinationId: 'dest-deleted' }),
      contentIndex(),
    );
    expect(result.session).toBeUndefined();
  });

  it('preserves compatible parent and subjourney progress in the shared WU003 progress model', () => {
    const withSubjourneyProgress = session({
      progress: {
        manualCompletedStepIds: [step('step-a')],
        externalOutcomeCompletedStepIds: [step('step-b')],
        satisfiedRequirementIds: [requirement('req-a')],
      },
    });

    const result = revalidateSession(withSubjourneyProgress, contentIndex());
    expect(result.session?.progress).toEqual(withSubjourneyProgress.progress);
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

  it('leaves a current-version envelope untouched', () => {
    const current = envelope({ contentVersion: 'hash-current' });
    const result = revalidateEnvelope(current, 'hash-current', contentIndex(), '2026-03-01T00:00:00.000Z');
    expect(result.changed).toBe(false);
    expect(result.envelope).toBe(current);
  });

  it('stamps the envelope with the current contentVersion after revalidation', () => {
    const result = revalidateEnvelope(envelope(), 'hash-new', contentIndex(), '2026-03-01T00:00:00.000Z');
    expect(result.changed).toBe(true);
    expect(result.envelope.contentVersion).toBe('hash-new');
    expect(result.envelope.updatedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('removes a deleted-root session while preserving other sessions', () => {
    const stale = envelope({
      sessions: [session({ id: 'keep' }), session({ id: 'drop', rootDestinationId: 'dest-deleted' })],
    });
    const result = revalidateEnvelope(stale, 'hash-new', contentIndex(), '2026-03-01T00:00:00.000Z');
    expect(result.envelope.sessions.map((item) => item.id)).toEqual(['keep']);
    expect(result.discardedSessionIds).toEqual(['drop']);
  });
});
