import type { PersistedSession, PersistedStateEnvelope } from './schema';

/**
 * The minimal current-content surface revalidation needs: which ids still
 * exist. Callers build this from the live `ContentGraph`/`DestinationGraph`
 * (WU003/WU004) rather than this module importing content directly, so
 * persistence stays decoupled from how content is assembled.
 */
export interface RevalidationContentIndex {
  readonly destinationIds: ReadonlySet<string>;
  readonly stepIds: ReadonlySet<string>;
  readonly requirementIds: ReadonlySet<string>;
}

export interface SessionRevalidationResult {
  /** `undefined` when the session's root Destination no longer exists at all -- it cannot be revalidated, only discarded. */
  readonly session: PersistedSession | undefined;
  readonly discardedStepIds: readonly string[];
  readonly discardedRequirementIds: readonly string[];
}

/**
 * Deterministic per-session revalidation against current canonical content:
 * ids that still exist are preserved; ids that no longer exist (a step or
 * requirement removed or renamed by a content change) are dropped rather
 * than trusted, and a session whose root Destination itself no longer
 * exists is discarded entirely rather than resumed against content it can
 * no longer address. This never re-derives routing state (actionable /
 * waiting / blocked) -- that stays the engine's job (WU003) the next time
 * the session is resolved; revalidation only guarantees the *inputs* to
 * that resolution are honest.
 */
export function revalidateSession(
  session: PersistedSession,
  content: RevalidationContentIndex,
): SessionRevalidationResult {
  if (!content.destinationIds.has(session.rootDestinationId)) {
    return { session: undefined, discardedStepIds: [], discardedRequirementIds: [] };
  }

  const keepStep = (id: string): boolean => content.stepIds.has(id);
  const keepRequirement = (id: string): boolean => content.requirementIds.has(id);

  const manualCompletedStepIds = session.progress.manualCompletedStepIds.filter(keepStep);
  const externalOutcomeCompletedStepIds = session.progress.externalOutcomeCompletedStepIds.filter(keepStep);
  const satisfiedRequirementIds = session.progress.satisfiedRequirementIds.filter(keepRequirement);

  const discardedStepIds = [
    ...session.progress.manualCompletedStepIds.filter((id) => !keepStep(id)),
    ...session.progress.externalOutcomeCompletedStepIds.filter((id) => !keepStep(id)),
  ];
  const discardedRequirementIds = session.progress.satisfiedRequirementIds.filter((id) => !keepRequirement(id));

  return {
    session: {
      ...session,
      progress: {
        manualCompletedStepIds,
        externalOutcomeCompletedStepIds,
        satisfiedRequirementIds,
      },
    },
    discardedStepIds,
    discardedRequirementIds,
  };
}

export interface EnvelopeRevalidationResult {
  readonly envelope: PersistedStateEnvelope;
  readonly changed: boolean;
  readonly discardedSessionIds: readonly string[];
}

/**
 * Revalidates every session in an envelope and stamps the envelope with the
 * current `contentVersion` on success. A saved envelope whose
 * `contentVersion` differs from the current canonical `contentHash` must
 * never be trusted as-is (docs/governance/versioning.md); this is the only
 * path that lets a stale envelope become current again.
 */
export function revalidateEnvelope(
  envelope: PersistedStateEnvelope,
  currentContentVersion: string,
  content: RevalidationContentIndex,
  now: string,
): EnvelopeRevalidationResult {
  if (envelope.contentVersion === currentContentVersion) {
    return { envelope, changed: false, discardedSessionIds: [] };
  }

  const discardedSessionIds: string[] = [];
  const sessions: PersistedSession[] = [];

  for (const session of envelope.sessions) {
    const result = revalidateSession(session, content);
    if (result.session === undefined) {
      discardedSessionIds.push(session.id);
      continue;
    }
    sessions.push(result.session);
  }

  return {
    envelope: {
      schemaVersion: envelope.schemaVersion,
      contentVersion: currentContentVersion,
      updatedAt: now,
      sessions,
    },
    changed: true,
    discardedSessionIds,
  };
}
