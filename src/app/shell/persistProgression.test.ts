import { describe, expect, it } from 'vitest';

import { persistShellSession } from './persistProgression';
import { createSessionFromCandidate } from './sessionState';
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
