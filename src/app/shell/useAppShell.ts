'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';

import type { AppBootstrap } from './bootstrap';
import { toDestinationGraph, toRevalidationContentIndex } from './reconstruct';
import { restorationNoticeFor } from './restorationNotice';
import { fromPersistedSession, toPersistedSession } from './sessionState';
import { initialShellState, shellReducer } from './shellReducer';
import type { ShellAction, ShellState } from './shellReducer';
import { useHydratedSession } from '../../persistence/react/useHydratedSession';
import { LocalStorageAdapter } from '../../persistence/localStorageAdapter';
import { createEmptyEnvelope, savePersistedState } from '../../persistence/state';
import type { PersistedStateEnvelope } from '../../persistence/schema';
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

    const restoredPersistedSession = hydration.envelope.sessions[0];
    const restoredSession = restoredPersistedSession ? fromPersistedSession(restoredPersistedSession) : undefined;
    const notice = restorationNoticeFor(hydration.reason, hydration.discardedSessionIds);

    dispatch({ type: 'sessionRestored', session: restoredSession, notice });
  }, [hydration]);

  const persistenceAvailable = hydration.status === 'ready';
  const hydrated = hydration.status !== 'loading';

  const previousSessionId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) return;
    if (!persistenceAvailable) return;

    const adapter = new LocalStorageAdapter();
    const timestamp = now();

    if (!state.session) {
      if (previousSessionId.current !== undefined) {
        const emptyEnvelope = createEmptyEnvelope(bootstrap.contentVersion, timestamp);
        savePersistedState(adapter, emptyEnvelope);
      }
      previousSessionId.current = undefined;
      return;
    }

    previousSessionId.current = state.session.id;
    const persistedSession = toPersistedSession(state.session, revalidationIndex, timestamp);
    const envelope: PersistedStateEnvelope = {
      schemaVersion: 2,
      contentVersion: bootstrap.contentVersion,
      updatedAt: timestamp,
      sessions: [persistedSession],
    };
    savePersistedState(adapter, envelope);
  }, [state.session, hydrated, persistenceAvailable, bootstrap.contentVersion, revalidationIndex]);

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
