import { revalidateEnvelope } from './revalidate';
import type { RevalidationContentIndex } from './revalidate';
import { createEmptyEnvelope, loadPersistedState, resetPersistedState, savePersistedState } from './state';
import type { LoadStateOutcome } from './state';
import type { PersistedStateEnvelope } from './schema';
import type { StorageAdapter } from './storageAdapter';

/**
 * The single client-side entry point that composes load -> migrate ->
 * revalidate -> (re)save into one deterministic outcome. This is pure with
 * respect to I/O timing (the caller supplies `now` and the adapter), so it
 * can run identically in a test and in the browser; it is the function the
 * hydration boundary (hydration.ts) calls after mount.
 *
 * `reason` always reflects what actually happened to the loaded data, so a
 * consuming UI (WU007) has enough information to explain a reset or
 * revalidation to the user without this module knowing anything about UI.
 */
export type ResumeReason =
  | 'freshStart'
  | 'restoredCurrent'
  | 'revalidatedContentChange'
  | 'resetMalformedJson'
  | 'resetInvalidSchema'
  | 'resetUnsupportedVersion'
  | 'resetStorageUnavailable';

export interface ResumeResult {
  readonly envelope: PersistedStateEnvelope;
  readonly reason: ResumeReason;
  readonly discardedSessionIds: readonly string[];
}

export function resumePersistedState(
  adapter: StorageAdapter,
  currentContentVersion: string,
  content: RevalidationContentIndex,
  now: string,
): ResumeResult {
  const outcome: LoadStateOutcome = loadPersistedState(adapter);

  if (outcome.status !== 'ok') {
    const fresh = createEmptyEnvelope(currentContentVersion, now);
    if (outcome.status !== 'empty') {
      resetPersistedState(adapter);
      savePersistedState(adapter, fresh);
      return { envelope: fresh, reason: toResetReason(outcome.status), discardedSessionIds: [] };
    }
    savePersistedState(adapter, fresh);
    return { envelope: fresh, reason: 'freshStart', discardedSessionIds: [] };
  }

  const revalidation = revalidateEnvelope(outcome.state, currentContentVersion, content, now);
  if (revalidation.changed) {
    savePersistedState(adapter, revalidation.envelope);
    return {
      envelope: revalidation.envelope,
      reason: 'revalidatedContentChange',
      discardedSessionIds: revalidation.discardedSessionIds,
    };
  }

  return { envelope: outcome.state, reason: 'restoredCurrent', discardedSessionIds: [] };
}

function toResetReason(
  status: Exclude<LoadStateOutcome['status'], 'ok' | 'empty'>,
): ResumeReason {
  switch (status) {
    case 'malformedJson':
      return 'resetMalformedJson';
    case 'invalidSchema':
      return 'resetInvalidSchema';
    case 'unsupportedVersion':
      return 'resetUnsupportedVersion';
    case 'storageUnavailable':
      return 'resetStorageUnavailable';
  }
}
