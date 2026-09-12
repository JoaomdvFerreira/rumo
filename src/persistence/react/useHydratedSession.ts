'use client';

import { useRef, useSyncExternalStore } from 'react';

import { isLocalStorageAvailable, LocalStorageAdapter } from '../localStorageAdapter';
import { resumePersistedState } from '../resume';
import type { ResumeReason } from '../resume';
import type { RevalidationContentIndex } from '../revalidate';
import type { PersistedStateEnvelope } from '../schema';

/**
 * Next.js/browser hydration boundary (docs/architecture/guardrails.md):
 *
 *   server render -> stable non-personal shell -> client hydration
 *   -> browser storage load -> validated/revalidated session available
 *
 * Built on `useSyncExternalStore`, the standard React primitive for reading
 * an external, browser-only data source that legitimately differs between
 * server and client: React renders `getServerSnapshot`'s value
 * (`'loading'`) during server rendering *and* during the client's initial
 * hydration pass, so the first client render matches server-rendered
 * markup exactly. Only after hydration completes does React re-render with
 * `getSnapshot`'s real (client-only) value, which is the point at which the
 * `localStorage` read actually happens -- never earlier, never on the
 * server.
 *
 * `getSnapshot` must return a referentially-stable value when nothing has
 * changed (`useSyncExternalStore` compares with `Object.is` and would
 * otherwise re-render forever), so the resolved snapshot is memoized per
 * `currentContentVersion` in a ref local to this hook instance -- resumption
 * runs at most once per mount per content version, not on every render.
 *
 * There is no subscription target -- this hook does not observe live
 * storage mutations from other tabs -- so `subscribe` never calls its
 * listener.
 *
 * This hook intentionally renders no journey UI (WU007's responsibility):
 * it only exposes the explicit state machine a consuming component needs to
 * decide what to show.
 */
export type HydratedSessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'unavailable' }
  | { readonly status: 'ready'; readonly envelope: PersistedStateEnvelope; readonly reason: ResumeReason; readonly discardedSessionIds: readonly string[] };

const LOADING_STATE: HydratedSessionState = { status: 'loading' };

function subscribe(): () => void {
  return () => {
    // No live external updates are observed; the memoized snapshot is
    // resolved once per content version, not pushed by a storage
    // subscription.
  };
}

function resolveHydratedSessionSnapshot(
  currentContentVersion: string,
  content: RevalidationContentIndex,
): HydratedSessionState {
  if (!isLocalStorageAvailable()) {
    return { status: 'unavailable' };
  }

  const adapter = new LocalStorageAdapter();
  const result = resumePersistedState(adapter, currentContentVersion, content, new Date().toISOString());
  return {
    status: 'ready',
    envelope: result.envelope,
    reason: result.reason,
    discardedSessionIds: result.discardedSessionIds,
  };
}

interface SnapshotCache {
  contentVersion: string | undefined;
  state: HydratedSessionState;
}

export function useHydratedSession(
  currentContentVersion: string,
  content: RevalidationContentIndex,
): HydratedSessionState {
  const cacheRef = useRef<SnapshotCache>({ contentVersion: undefined, state: LOADING_STATE });

  const getSnapshot = (): HydratedSessionState => {
    if (cacheRef.current.contentVersion === currentContentVersion) {
      return cacheRef.current.state;
    }
    const state = resolveHydratedSessionSnapshot(currentContentVersion, content);
    cacheRef.current = { contentVersion: currentContentVersion, state };
    return state;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING_STATE);
}
