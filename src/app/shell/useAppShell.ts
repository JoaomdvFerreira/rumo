'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { AppBootstrap } from './bootstrap';
import { attemptResetCleanup, persistShellSession } from './persistProgression';
import { toDestinationGraph, toRevalidationContentIndex } from './reconstruct';
import { restorationNoticeFor } from './restorationNotice';
import { fromPersistedSession, selectMostRecentSession } from './sessionState';
import { initialShellState, shellReducer } from './shellReducer';
import type { ShellAction, ShellState } from './shellReducer';
import { useHydratedSession } from '../../persistence/react/useHydratedSession';
import { LocalStorageAdapter } from '../../persistence/localStorageAdapter';
import { resolveDestination } from '../../domain/engine/destination';
import type { DestinationResolution } from '../../domain/engine/destination';

const now = () => new Date().toISOString();

export interface AppShellRuntime {
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly resolution: DestinationResolution | undefined;
  readonly persistenceAvailable: boolean;
  readonly hydrated: boolean;
}

/**
 * Composes the WU005 hydration boundary, the transient UI reducer, and the
 * WU003 domain engine into one runtime the shell components consume.
 * Persistence writes happen here (not in the reducer, which stays a pure
 * state transition) so every meaningful progression -- fact answer,
 * requirement confirmation, task/outcome completion, reset -- is persisted
 * exactly once, immediately after the state that represents it settles.
 */
export function useAppShell(bootstrap: AppBootstrap): AppShellRuntime {
  const destinationGraph = useMemo(() => toDestinationGraph(bootstrap), [bootstrap]);
  const revalidationIndex = useMemo(
    () => toRevalidationContentIndex(bootstrap.revalidationContentIndex),
    [bootstrap],
  );

  const hydration = useHydratedSession(bootstrap.contentVersion, revalidationIndex);

  const [state, dispatch] = useReducer(shellReducer, undefined, () => initialShellState(undefined, undefined));
  const didConsumeHydration = useRef(false);

  useEffect(() => {
    if (hydration.status === 'loading' || didConsumeHydration.current) return;
    didConsumeHydration.current = true;

    // F2 remediation (Project Overseer review of WU007/C007): the MVP
    // supports exactly one active session, but a persisted envelope can
    // still (transiently, e.g. mid-migration) carry more than one. The
    // session to resume must be selected deterministically -- by most
    // recent `updatedAt`, with a stable id tie-break -- never by array
    // position, which depends only on write order and is not a meaningful
    // "most recent" signal.
    const restoredPersistedSession = selectMostRecentSession(hydration.envelope.sessions);
    const restoredSession = restoredPersistedSession ? fromPersistedSession(restoredPersistedSession) : undefined;
    const notice = restorationNoticeFor(hydration.reason, hydration.discardedSessionIds);

    dispatch({ type: 'sessionRestored', session: restoredSession, notice });
  }, [hydration]);

  const hydrated = hydration.status !== 'loading';

  /**
   * F1 remediation (Project Overseer review of WU007/C007): a session that
   * hydrated successfully can still fail to persist a later write (quota
   * exceeded, storage revoked mid-session, private-mode eviction, etc).
   * WU005's `savePersistedState` already reports this as a typed
   * `SaveStateOutcome` rather than throwing -- this hook must actually
   * consult that outcome instead of firing-and-forgetting it. Once any
   * write (or the reset write) reports `storageUnavailable`, runtime
   * persistence availability flips to `false` for the rest of this session
   * so the existing non-blocking disclosure appears immediately; the
   * in-memory session/reducer keep working exactly as before -- this never
   * throws and never blocks the UI. A later successful write is not
   * specially detected to auto-recover (no simple deterministic signal
   * distinguishes "still broken" from "happened to work once"); the
   * disclosure staying visible once storage has proven unreliable this
   * session is the conservative, honest choice.
   */
  const [writeFailed, setWriteFailed] = useState(false);
  const persistenceAvailable = hydration.status === 'ready' && !writeFailed;

  const previousSessionId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) return;
    if (hydration.status !== 'ready') return;

    const hadSession = previousSessionId.current !== undefined;
    const isReset = hadSession && !state.session;

    /**
     * F5 remediation (Project Overseer review of WU007/C007): a prior write
     * failure may permanently degrade normal progression writes for the
     * rest of this visit (no auto-recovery, per F1) -- but it must never
     * suppress the one bounded best-effort cleanup attempt an explicit
     * "Começar de novo" reset makes. The two paths are handled separately
     * below so a reset is never skipped merely because `writeFailed` is
     * already `true`; a non-reset write, however, still short-circuits on
     * `writeFailed` exactly as before.
     */
    if (isReset) {
      previousSessionId.current = undefined;
      const adapter = new LocalStorageAdapter();
      // One bounded attempt per reset: `previousSessionId.current` has
      // already been cleared above, so this effect will not see `isReset`
      // true again until a new session exists and is reset once more --
      // there is no loop, regardless of whether cleanup below succeeds.
      const result = attemptResetCleanup(adapter);
      if (result.status !== 'ok' && !writeFailed) {
        queueMicrotask(() => setWriteFailed(true));
      }
      return;
    }

    if (writeFailed) return;
    if (!state.session && !hadSession) return;
    previousSessionId.current = state.session?.id;

    const adapter = new LocalStorageAdapter();
    const result = persistShellSession(adapter, bootstrap.contentVersion, state.session, revalidationIndex, now());
    if (result.status !== 'ok') {
      // Deferred rather than called synchronously within the effect body:
      // this is a genuine external-system outcome (a storage write just
      // failed), not state React can derive during render, so it is
      // reported back on the next microtask instead of triggering a
      // same-tick cascading re-render from inside the effect.
      queueMicrotask(() => setWriteFailed(true));
    }
  }, [state.session, hydrated, hydration.status, writeFailed, bootstrap.contentVersion, revalidationIndex]);

  const resolution = useMemo(() => {
    if (!state.session) return undefined;
    return resolveDestination(state.session.rootDestinationId, destinationGraph, {
      facts: state.session.facts,
      progress: state.session.progress,
    });
  }, [state.session, destinationGraph]);

  return { state, dispatch, resolution, persistenceAvailable, hydrated };
}

export { now as nowIso };
