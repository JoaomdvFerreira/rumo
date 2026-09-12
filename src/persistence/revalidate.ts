import type { PersistedSession, PersistedStateEnvelope } from './schema';

/**
 * The current-content compatibility surface: existing Destinations,
 * semantic fingerprints, and root-relative structural reachability.
 * Callers build it from the live ContentGraph rather than this module
 * importing content directly.
 */
export interface RevalidationContentIndex {
  readonly destinationIds: ReadonlySet<string>;
  readonly stepFingerprints: ReadonlyMap<string, string>;
  readonly requirementFingerprints: ReadonlyMap<string, string>;
  readonly reachableStepIdsByDestination: ReadonlyMap<string, ReadonlySet<string>>;
  readonly reachableRequirementIdsByDestination: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface SessionRevalidationResult {
  /** `undefined` when the session's root Destination no longer exists at all -- it cannot be revalidated, only discarded. */
  readonly session: PersistedSession | undefined;
  readonly discardedStepIds: readonly string[];
  readonly discardedRequirementIds: readonly string[];
}

/**
 * Deterministic per-session revalidation against current canonical content:
 * progress is preserved only when its persisted semantic fingerprint
 * matches the current entity and that entity remains structurally reachable
 * from the session root. Missing, moved, or semantically changed entities
 * are dropped rather than trusted. This never re-derives routing state (actionable /
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

  const reachableStepIds =
    content.reachableStepIdsByDestination.get(session.rootDestinationId) ?? new Set<string>();
  const reachableRequirementIds =
    content.reachableRequirementIdsByDestination.get(session.rootDestinationId) ?? new Set<string>();
  const keepStep = (entry: PersistedSession['progress']['manualCompletedStepIds'][number]): boolean =>
    reachableStepIds.has(entry.id) && content.stepFingerprints.get(entry.id) === entry.fingerprint;
  const keepRequirement = (entry: PersistedSession['progress']['satisfiedRequirementIds'][number]): boolean =>
    reachableRequirementIds.has(entry.id) && content.requirementFingerprints.get(entry.id) === entry.fingerprint;

  const manualCompletedStepIds = session.progress.manualCompletedStepIds.filter(keepStep);
  const externalOutcomeCompletedStepIds = session.progress.externalOutcomeCompletedStepIds.filter(keepStep);
  const satisfiedRequirementIds = session.progress.satisfiedRequirementIds.filter(keepRequirement);

  const discardedStepIds = [
    ...session.progress.manualCompletedStepIds.filter((entry) => !keepStep(entry)).map((entry) => entry.id),
    ...session.progress.externalOutcomeCompletedStepIds.filter((entry) => !keepStep(entry)).map((entry) => entry.id),
  ];
  const discardedRequirementIds = session.progress.satisfiedRequirementIds
    .filter((entry) => !keepRequirement(entry))
    .map((entry) => entry.id);

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
