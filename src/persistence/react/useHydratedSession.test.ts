import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createHydratedSessionStore, useHydratedSession } from './useHydratedSession';
import type { RevalidationContentIndex } from '../revalidate';
import { InMemoryStorageAdapter } from '../storageAdapter';

const content: RevalidationContentIndex = {
  destinationIds: new Set(['dest-root']),
  stepFingerprints: new Map(),
  requirementFingerprints: new Map(),
  reachableStepIdsByDestination: new Map([['dest-root', new Set()]]),
  reachableRequirementIdsByDestination: new Map([['dest-root', new Set()]]),
};

describe('useHydratedSession hydration boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('server-renders loading without constructing or touching browser storage', () => {
    let storageAccesses = 0;
    vi.stubGlobal('window', {
      get localStorage() {
        storageAccesses += 1;
        throw new Error('storage must not be touched during render');
      },
    });

    function Probe() {
      const state = useHydratedSession('hash-current', content);
      return createElement('span', null, state.status);
    }

    expect(renderToString(createElement(Probe))).toBe('<span>loading</span>');
    expect(storageAccesses).toBe(0);
  });

  it('keeps the first client snapshot loading and resolves storage only during post-mount initialization', () => {
    let adapterCreations = 0;
    const store = createHydratedSessionStore(
      'hash-current',
      content,
      () => {
        adapterCreations += 1;
        return new InMemoryStorageAdapter();
      },
      () => '2026-03-01T00:00:00.000Z',
    );

    expect(store.getSnapshot()).toEqual({ status: 'loading' });
    expect(adapterCreations).toBe(0);

    store.initialize();

    expect(adapterCreations).toBe(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', persistenceStatus: 'persisted' });
  });
});
