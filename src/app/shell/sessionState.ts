import type { IntentCandidate } from '../../domain/model/intent';
import type { FactSet } from '../../domain/model/fact';
import type { RuntimeProgress } from '../../domain/engine/runtime';
import type { PersistedSession } from '../../persistence/schema';
import { toPersistedRuntimeProgress, toRuntimeProgress } from '../../persistence/progress';
import type { RevalidationContentIndex } from '../../persistence/revalidate';

/**
 * One active MVP journey session (WU007 "SESSION / PERSISTENCE": one active
 * session only, no multi-session manager). This is a thin, render-facing
 * view over the same data `PersistedSession` already carries -- it exists
 * so UI code manipulates plain Sets/FactSet without repeatedly
 * serializing/deserializing the persisted array form on every interaction.
 */
export interface ActiveSession {
  readonly id: string;
  readonly rootDestinationId: string;
  readonly facts: FactSet;
  readonly progress: RuntimeProgress;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Deterministic single-session selection (F2 remediation, Project Overseer
 * review of WU007/C007): resuming must never trust array position -- a
 * persisted envelope's `sessions` order reflects only how it was written
 * (see `revalidateEnvelope`, which rebuilds the array by iterating the
 * previous one), not recency. The MVP supports exactly one active session,
 * so when more than one is present (e.g. transiently across a migration or
 * a future multi-tab write), the one to resume is the most recently
 * updated by `updatedAt`; equal timestamps fall back to the lexicographically
 * greatest `id` as a stable, deterministic tie-break so the same input
 * array always yields the same selection regardless of declaration order.
 */
export function selectMostRecentSession(
  sessions: readonly PersistedSession[],
): PersistedSession | undefined {
  return sessions.reduce<PersistedSession | undefined>((mostRecent, candidate) => {
    if (!mostRecent) return candidate;
    if (candidate.updatedAt !== mostRecent.updatedAt) {
      return candidate.updatedAt > mostRecent.updatedAt ? candidate : mostRecent;
    }
    return candidate.id > mostRecent.id ? candidate : mostRecent;
  }, undefined);
}

export function fromPersistedSession(session: PersistedSession): ActiveSession {
  return {
    id: session.id,
    rootDestinationId: session.rootDestinationId,
    facts: session.facts,
    progress: toRuntimeProgress(session.progress),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function toPersistedSession(
  session: ActiveSession,
  content: RevalidationContentIndex,
  now: string,
): PersistedSession {
  return {
    id: session.id,
    rootDestinationId: session.rootDestinationId,
    facts: session.facts,
    progress: toPersistedRuntimeProgress(session.progress, session.rootDestinationId, content),
    createdAt: session.createdAt,
    updatedAt: now,
  };
}

let sessionCounter = 0;

/** Deterministic-enough, collision-safe id for one browser session's active journey. */
export function generateSessionId(now: string): string {
  sessionCounter += 1;
  return `session.${now}.${sessionCounter}`;
}

export function createSessionFromCandidate(
  candidate: IntentCandidate,
  now: string,
): ActiveSession {
  return {
    id: generateSessionId(now),
    rootDestinationId: candidate.destinationId,
    facts: { ...candidate.facts },
    progress: {
      manualCompletedStepIds: new Set(),
      externalOutcomeCompletedStepIds: new Set(),
      satisfiedRequirementIds: new Set(),
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function withFact(session: ActiveSession, factKey: string, value: FactSet[string], now: string): ActiveSession {
  return { ...session, facts: { ...session.facts, [factKey]: value }, updatedAt: now };
}

function withSetToggled(set: ReadonlySet<string>, id: string, present: boolean): ReadonlySet<string> {
  const next = new Set(set);
  if (present) next.add(id);
  else next.delete(id);
  return next;
}

export function withManualStepCompleted(session: ActiveSession, stepId: string, now: string): ActiveSession {
  return {
    ...session,
    progress: {
      ...session.progress,
      manualCompletedStepIds: withSetToggled(session.progress.manualCompletedStepIds, stepId, true),
    },
    updatedAt: now,
  };
}

export function withExternalOutcomeCompleted(session: ActiveSession, stepId: string, now: string): ActiveSession {
  return {
    ...session,
    progress: {
      ...session.progress,
      externalOutcomeCompletedStepIds: withSetToggled(
        session.progress.externalOutcomeCompletedStepIds,
        stepId,
        true,
      ),
    },
    updatedAt: now,
  };
}

export function withRequirementSatisfied(
  session: ActiveSession,
  requirementId: string,
  satisfied: boolean,
  now: string,
): ActiveSession {
  return {
    ...session,
    progress: {
      ...session.progress,
      satisfiedRequirementIds: withSetToggled(session.progress.satisfiedRequirementIds, requirementId, satisfied),
    },
    updatedAt: now,
  };
}
