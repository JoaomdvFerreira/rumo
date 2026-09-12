import { describe, expect, it } from 'vitest';

import { attemptResetCleanup, persistShellSession } from './persistProgression';
import { createSessionFromCandidate } from './sessionState';
import { loadPersistedState } from '../../persistence/state';
import { InMemoryStorageAdapter } from '../../persistence/storageAdapter';
import type { StorageAdapter, StorageMutationResult, StorageReadResult } from '../../persistence/storageAdapter';
import type { IntentCandidate } from '../../domain/model/intent';
import type { RevalidationContentIndex } from '../../persistence/revalidate';

const content: RevalidationContentIndex = {
  destinationIds: new Set(['destination.j01-settle-new-address']),
  stepFingerprints: new Map(),
  requirementFingerprints: new Map(),
  reachableStepIdsByDestination: new Map([['destination.j01-settle-new-address', new Set()]]),
  reachableRequirementIdsByDestination: new Map([['destination.j01-settle-new-address', new Set()]]),
};

const candidate: IntentCandidate = {
  destinationId: 'destination.j01-settle-new-address',
  score: 100,
  confidence: 'high',
  evidence: { intentId: 'intent.j01-moving-home', aliasId: 'alias.j01-launch-label', kind: 'alias', phrase: 'Mudar de casa' },
  facts: {},
};

/** Simulates a storage backend whose writes always fail (quota exceeded, storage revoked mid-session, etc). */
class WriteFailingStorageAdapter implements StorageAdapter {
  read(): StorageReadResult {
    return { status: 'missing' };
  }
  write(): StorageMutationResult {
    return { status: 'unavailable', reason: 'simulated quota exceeded' };
  }
  remove(): StorageMutationResult {
    return { status: 'unavailable', reason: 'simulated quota exceeded' };
  }
}

/**
 * F5 fixture: wraps a real in-memory store but forces every `write` to fail
 * (e.g. quota exceeded) while `remove` still delegates to the real backing
 * store and can succeed -- a realistic model of "further writes keep
 * failing, but freeing the key via removal still works," which is exactly
 * the case the reset-cleanup path exists for.
 */
class WriteFailingButRemovableStorageAdapter implements StorageAdapter {
  constructor(private readonly backing: InMemoryStorageAdapter) {}
  read(key: string): StorageReadResult {
    return this.backing.read(key);
  }
  write(): StorageMutationResult {
    return { status: 'unavailable', reason: 'simulated quota exceeded' };
  }
  remove(key: string): StorageMutationResult {
    return this.backing.remove(key);
  }
}

/** Simulates a storage backend where every operation, including removal, fails. */
class FullyFailingStorageAdapter implements StorageAdapter {
  read(): StorageReadResult {
    return { status: 'unavailable', reason: 'simulated storage revoked' };
  }
  write(): StorageMutationResult {
    return { status: 'unavailable', reason: 'simulated storage revoked' };
  }
  remove(): StorageMutationResult {
    return { status: 'unavailable', reason: 'simulated storage revoked' };
  }
}

describe('persistShellSession (F1: propagate post-hydration persistence failure)', () => {
  it('reports ok when the underlying write succeeds', () => {
    const adapter = new InMemoryStorageAdapter();
    const session = createSessionFromCandidate(candidate, '2026-01-01T00:00:00.000Z');
    const result = persistShellSession(adapter, 'content-hash-1', session, content, '2026-01-01T00:00:00.000Z');
    expect(result.status).toBe('ok');
  });

  it('reports storageUnavailable when a later session write fails, without throwing', () => {
    const adapter = new WriteFailingStorageAdapter();
    const session = createSessionFromCandidate(candidate, '2026-01-01T00:00:00.000Z');
    expect(() =>
      persistShellSession(adapter, 'content-hash-1', session, content, '2026-01-01T00:00:00.000Z'),
    ).not.toThrow();
    const result = persistShellSession(adapter, 'content-hash-1', session, content, '2026-01-01T00:00:00.000Z');
    expect(result.status).toBe('storageUnavailable');
  });

  it('reports storageUnavailable when the reset (empty-envelope) write fails', () => {
    const adapter = new WriteFailingStorageAdapter();
    const result = persistShellSession(adapter, 'content-hash-1', undefined, content, '2026-01-01T00:00:00.000Z');
    expect(result.status).toBe('storageUnavailable');
  });

  it('succeeds for the reset path when the adapter is healthy', () => {
    const adapter = new InMemoryStorageAdapter();
    const result = persistShellSession(adapter, 'content-hash-1', undefined, content, '2026-01-01T00:00:00.000Z');
    expect(result.status).toBe('ok');
  });
});

describe('attemptResetCleanup (F5: reset must still attempt cleanup after persistence degradation)', () => {
  it('A-E: makes a best-effort cleanup attempt that removes a prior persisted session, even though an earlier write in the same visit failed', () => {
    // A. A prior session exists and persists.
    const backing = new InMemoryStorageAdapter();
    const session = createSessionFromCandidate(candidate, '2026-01-01T00:00:00.000Z');
    const initialWrite = persistShellSession(backing, 'content-hash-1', session, content, '2026-01-01T00:00:00.000Z');
    expect(initialWrite.status).toBe('ok');
    expect(loadPersistedState(backing).status).toBe('ok');

    // B. A later progression write returns storageUnavailable (simulated by
    // switching to an adapter whose writes fail but whose removal still
    // delegates to the same backing store -- i.e. the visit has degraded,
    // but the stale session from A is still sitting in storage).
    const degradedAdapter = new WriteFailingButRemovableStorageAdapter(backing);
    const failedWrite = persistShellSession(degradedAdapter, 'content-hash-1', session, content, '2026-01-02T00:00:00.000Z');
    expect(failedWrite.status).toBe('storageUnavailable');
    expect(loadPersistedState(backing).status).toBe('ok'); // stale session A is still there

    // C/D. The user resets; cleanup is still attempted (never skipped just
    // because persistence already degraded).
    const cleanupResult = attemptResetCleanup(degradedAdapter);

    // E. Cleanup succeeds, so the stale persisted session is gone.
    expect(cleanupResult.status).toBe('ok');
    const reread = loadPersistedState(backing);
    expect(reread.status).toBe('empty');
  });

  it('D: still attempts cleanup even when cleanup itself also fails, and never throws', () => {
    const adapter = new FullyFailingStorageAdapter();
    expect(() => attemptResetCleanup(adapter)).not.toThrow();
    const result = attemptResetCleanup(adapter);
    expect(result.status).toBe('storageUnavailable');
  });

  it('G: a reload-equivalent read after successful cleanup cannot recover the stale pre-reset session', () => {
    const backing = new InMemoryStorageAdapter();
    const session = createSessionFromCandidate(candidate, '2026-01-01T00:00:00.000Z');
    persistShellSession(backing, 'content-hash-1', session, content, '2026-01-01T00:00:00.000Z');
    expect(loadPersistedState(backing).status).toBe('ok');

    const cleanupResult = attemptResetCleanup(backing);
    expect(cleanupResult.status).toBe('ok');

    // Simulates a page reload: an entirely fresh read against the same
    // underlying storage must not resurrect the session cleared above.
    const rereadAfterReload = loadPersistedState(backing);
    expect(rereadAfterReload.status).toBe('empty');
  });

  it('one reset interaction performs exactly one cleanup call (no repeated cleanup loop)', () => {
    const backing = new InMemoryStorageAdapter();
    let removeCalls = 0;
    const countingAdapter: StorageAdapter = {
      read: (key) => backing.read(key),
      write: (key, value) => backing.write(key, value),
      remove: (key) => {
        removeCalls += 1;
        return backing.remove(key);
      },
    };

    attemptResetCleanup(countingAdapter);
    expect(removeCalls).toBe(1);
  });
});
