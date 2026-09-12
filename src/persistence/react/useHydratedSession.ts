'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { LocalStorageAdapter } from '../localStorageAdapter';
import { resumePersistedState } from '../resume';
import type { ResumeReason } from '../resume';
import type { RevalidationContentIndex } from '../revalidate';
import type { PersistedStateEnvelope } from '../schema';
import type { StorageAdapter } from '../storageAdapter';

/**
 * Render-pure Next.js/browser hydration boundary:
 *
 *   server render -> loading -> first client hydration render -> loading
 *   -> post-mount effect initializes storage -> ready/unavailable
 *
 * `getSnapshot` only reads an in-memory value. All availability checks,
 * reads, migrations, revalidation, resets, and writes happen in
 * `initialize`, which the hook invokes from `useEffect` after hydration.
 */
export type HydratedSessionState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'unavailable' | 'ready';
      readonly envelope: PersistedStateEnvelope;
      readonly reason: ResumeReason;
      readonly discardedSessionIds: readonly string[];
      readonly persistenceStatus: 'persisted' | 'unavailable';
    };

export const LOADING_STATE: HydratedSessionState = { status: 'loading' };

export interface HydratedSessionStore {
  readonly getSnapshot: () => HydratedSessionState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly initialize: () => void;
}

export function createHydratedSessionStore(
  currentContentVersion: string,
  content: RevalidationContentIndex,
  createAdapter: () => StorageAdapter = () => new LocalStorageAdapter(),
  now: () => string = () => new Date().toISOString(),
): HydratedSessionStore {
  let state = LOADING_STATE;
  let initialized = false;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: () => {
      if (initialized) return;
      initialized = true;
      const result = resumePersistedState(createAdapter(), currentContentVersion, content, now());
      state = {
        status: result.persistenceStatus === 'persisted' ? 'ready' : 'unavailable',
        envelope: result.envelope,
        reason: result.reason,
        discardedSessionIds: result.discardedSessionIds,
        persistenceStatus: result.persistenceStatus,
      };
      listeners.forEach((listener) => listener());
    },
  };
}

export function useHydratedSession(
  currentContentVersion: string,
  content: RevalidationContentIndex,
): HydratedSessionState {
  const store = useMemo(
    () => createHydratedSessionStore(currentContentVersion, content),
    [currentContentVersion, content],
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => LOADING_STATE);

  useEffect(() => {
    store.initialize();
  }, [store]);

  return state;
}
