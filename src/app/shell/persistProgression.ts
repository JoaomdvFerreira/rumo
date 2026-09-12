import { createEmptyEnvelope, savePersistedState } from '../../persistence/state';
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
