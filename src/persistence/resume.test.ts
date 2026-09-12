import { describe, expect, it } from 'vitest';

import { resumePersistedState } from './resume';
import type { RevalidationContentIndex } from './revalidate';
import { CURRENT_SCHEMA_VERSION } from './schema';
import type { PersistedStateEnvelope } from './schema';
import type { StorageAdapter, StorageMutationResult, StorageReadResult } from './storageAdapter';
import { PERSISTENCE_STORAGE_KEY } from './state';

const NOW = '2026-03-01T00:00:00.000Z';

function contentIndex(): RevalidationContentIndex {
  return {
    destinationIds: new Set(['dest-root']),
    stepFingerprints: new Map([['step-a', 'fp-step-a']]),
    requirementFingerprints: new Map([['req-a', 'fp-req-a']]),
    reachableStepIdsByDestination: new Map([['dest-root', new Set(['step-a'])]]),
    reachableRequirementIdsByDestination: new Map([['dest-root', new Set(['req-a'])]]),
  };
}

class ControllableStorageAdapter implements StorageAdapter {
  value: string | undefined;
  readFails = false;
  writeFails = false;
  removeFails = false;

  read(_key: string): StorageReadResult {
    if (this.readFails) return { status: 'unavailable', reason: 'read failed' };
    return this.value === undefined ? { status: 'missing' } : { status: 'found', value: this.value };
  }
  write(_key: string, value: string): StorageMutationResult {
    if (this.writeFails) return { status: 'unavailable', reason: 'write failed' };
    this.value = value;
    return { status: 'ok' };
  }
  remove(_key: string): StorageMutationResult {
    if (this.removeFails) return { status: 'unavailable', reason: 'remove failed' };
    this.value = undefined;
    return { status: 'ok' };
  }
}

function savedEnvelope(contentVersion = 'hash-current'): PersistedStateEnvelope {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    contentVersion,
    updatedAt: '2026-01-01T00:00:00.000Z',
    sessions: [{
      id: 'session-1',
      rootDestinationId: 'dest-root',
      facts: {},
      progress: {
        manualCompletedStepIds: [{ id: 'step-a', fingerprint: 'fp-step-a' }],
        externalOutcomeCompletedStepIds: [],
        satisfiedRequirementIds: [],
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  };
}

describe('resumePersistedState', () => {
  it('creates and successfully persists a fresh envelope', () => {
    const adapter = new ControllableStorageAdapter();
    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);
    expect(result.reason).toBe('freshStart');
    expect(result.persistenceStatus).toBe('persisted');
    expect(adapter.read(PERSISTENCE_STORAGE_KEY).status).toBe('found');
  });

  it('reports unavailable when fresh-start persistence fails without throwing', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.writeFails = true;
    expect(() => resumePersistedState(adapter, 'hash-current', contentIndex(), NOW)).not.toThrow();
    expect(resumePersistedState(adapter, 'hash-current', contentIndex(), NOW).persistenceStatus).toBe('unavailable');
  });

  it('restores a current envelope as persisted', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.value = JSON.stringify(savedEnvelope());
    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);
    expect(result.reason).toBe('restoredCurrent');
    expect(result.persistenceStatus).toBe('persisted');
  });

  it('revalidates and persists under the current content version', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.value = JSON.stringify(savedEnvelope('hash-old'));
    const result = resumePersistedState(adapter, 'hash-new', contentIndex(), NOW);
    expect(result.reason).toBe('revalidatedContentChange');
    expect(result.envelope.contentVersion).toBe('hash-new');
    expect(result.persistenceStatus).toBe('persisted');
    expect(JSON.parse(adapter.value as string).contentVersion).toBe('hash-new');
  });

  it('reports unavailable when the post-revalidation write fails', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.value = JSON.stringify(savedEnvelope('hash-old'));
    adapter.writeFails = true;
    const result = resumePersistedState(adapter, 'hash-new', contentIndex(), NOW);
    expect(result.envelope.contentVersion).toBe('hash-new');
    expect(result.persistenceStatus).toBe('unavailable');
  });

  it('keeps an in-memory envelope but reports unavailable after a read failure', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.readFails = true;
    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);
    expect(result.reason).toBe('resetStorageUnavailable');
    expect(result.envelope.sessions).toEqual([]);
    expect(result.persistenceStatus).toBe('unavailable');
  });

  it('reports unavailable when reset removal fails and remains non-throwing', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.value = '{not json';
    adapter.removeFails = true;
    let result: ReturnType<typeof resumePersistedState> | undefined;
    expect(() => {
      result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);
    }).not.toThrow();
    expect(result?.reason).toBe('resetMalformedJson');
    expect(result?.persistenceStatus).toBe('unavailable');
  });

  it('migrates v1 without trusting its bare-id progress and persists v2', () => {
    const adapter = new ControllableStorageAdapter();
    adapter.value = JSON.stringify({
      schemaVersion: 1,
      contentVersion: 'hash-current',
      updatedAt: NOW,
      sessions: [{
        id: 'session-1', rootDestinationId: 'dest-root', facts: { 'household.size': 2 },
        progress: { manualCompletedStepIds: ['step-a'], externalOutcomeCompletedStepIds: [], satisfiedRequirementIds: [] },
        createdAt: NOW, updatedAt: NOW,
      }],
    });
    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);
    expect(result.reason).toBe('migratedSchema');
    expect(result.envelope.sessions[0]?.facts).toEqual({ 'household.size': 2 });
    expect(result.envelope.sessions[0]?.progress.manualCompletedStepIds).toEqual([]);
    expect(result.persistenceStatus).toBe('persisted');
  });
});
