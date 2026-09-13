import { createEmptyEnvelope, resetPersistedState, savePersistedState } from '../../persistence/state';
import type { SaveStateOutcome } from '../../persistence/state';
import type { PersistedStateEnvelope } from '../../persistence/schema';
import type { RevalidationContentIndex } from '../../persistence/revalidate';
import type { StorageAdapter } from '../../persistence/storageAdapter';
import { toPersistedSession } from './sessionState';
import type { ActiveSession } from './sessionState';

/**
 * Pure persistence-write orchestration for one progression tick (F1
 * remediation, Project Overseer review of WU007/C007): the previous
 * implementation called `savePersistedState` from inside a `useEffect` and
 * discarded its typed `SaveStateOutcome`, so a later write failure (quota
 * exceeded, storage revoked mid-session, private-mode eviction) was silently
 * swallowed -- the UI kept claiming persistence was available even after a
 * write had actually failed. Extracted here as a plain function (mirroring
 * how `useHydratedSession.ts` keeps its store logic outside the hook body)
 * so the outcome-handling behavior is directly unit-testable with
 * `InMemoryStorageAdapter`, without needing a React renderer.
 *
 * `session === undefined` persists the empty envelope (the reset path);
 * otherwise persists exactly the one active MVP session, matching the
 * existing one-session-only invariant.
 */
export function persistShellSession(
  adapter: StorageAdapter,
  contentVersion: string,
  session: ActiveSession | undefined,
  revalidationIndex: RevalidationContentIndex,
  now: string,
): SaveStateOutcome {
  if (!session) {
    const emptyEnvelope = createEmptyEnvelope(contentVersion, now);
    return savePersistedState(adapter, emptyEnvelope);
  }

  const persistedSession = toPersistedSession(session, revalidationIndex, now);
  const envelope: PersistedStateEnvelope = {
    schemaVersion: 2,
    contentVersion,
    updatedAt: now,
    sessions: [persistedSession],
  };
  return savePersistedState(adapter, envelope);
}

/**
 * F5 remediation (Project Overseer review of WU007/C007): a persistence
 * write failure legitimately degrades the *visit* to `persistenceAvailable
 * = false` (F1) -- normal progression writes may stay suppressed for the
 * rest of the visit, no automatic recovery required. But that degradation
 * must never prevent an explicit "Começar de novo" reset from making its
 * own best-effort attempt to clear whatever stale session was last
 * persisted: a user who resets in memory has a right to expect the app to
 * *try* to honor that reset in storage too, even if storage has proven
 * unreliable earlier in the visit. This uses WU005's dedicated
 * `resetPersistedState` (an explicit key removal) rather than
 * `persistShellSession(..., undefined, ...)` (which overwrites with an
 * empty envelope) -- removal is the more direct, and more likely to
 * succeed, primitive for "get rid of what's there," and matches the
 * semantics WU005 already defines for discarding untrusted persisted data.
 * Never throws; the caller is expected to keep runtime persistence
 * unavailable regardless of the outcome (no auto-recovery either way) and
 * to return to intent entry in memory immediately, independent of this
 * result.
 */
export function attemptResetCleanup(adapter: StorageAdapter): SaveStateOutcome {
  return resetPersistedState(adapter);
}
