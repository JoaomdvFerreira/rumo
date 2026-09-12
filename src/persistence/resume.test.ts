import { describe, expect, it } from 'vitest';

import { resumePersistedState } from './resume';
import type { RevalidationContentIndex } from './revalidate';
import { CURRENT_SCHEMA_VERSION } from './schema';
import type { PersistedStateEnvelope } from './schema';
import { InMemoryStorageAdapter } from './storageAdapter';
import type { StorageAdapter } from './storageAdapter';
import { PERSISTENCE_STORAGE_KEY } from './state';

const NOW = '2026-03-01T00:00:00.000Z';

function contentIndex(): RevalidationContentIndex {
  return {
    destinationIds: new Set(['dest-root']),
    stepIds: new Set(['step-a']),
    requirementIds: new Set(['req-a']),
  };
}

class FailingStorageAdapter implements StorageAdapter {
  read(): string | undefined {
    throw new Error('unavailable');
  }
  write(): boolean {
    return false;
  }
  remove(): void {
    // no-op
  }
}

describe('resumePersistedState', () => {
  it('creates and persists a fresh envelope when nothing was saved', () => {
    const adapter = new InMemoryStorageAdapter();

    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);

    expect(result.reason).toBe('freshStart');
    expect(result.envelope.contentVersion).toBe('hash-current');
    expect(adapter.read(PERSISTENCE_STORAGE_KEY)).toBeDefined();
  });

  it('restores a current-version envelope unchanged', () => {
    const adapter = new InMemoryStorageAdapter();
    const saved: PersistedStateEnvelope = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      contentVersion: 'hash-current',
      updatedAt: NOW,
      sessions: [],
    };
    adapter.write(PERSISTENCE_STORAGE_KEY, JSON.stringify(saved));

    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);

    expect(result.reason).toBe('restoredCurrent');
    expect(result.envelope).toEqual(saved);
  });

  it('revalidates and re-persists when contentVersion has changed', () => {
    const adapter = new InMemoryStorageAdapter();
    const saved: PersistedStateEnvelope = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      contentVersion: 'hash-old',
      updatedAt: '2026-01-01T00:00:00.000Z',
      sessions: [
        {
          id: 'session-1',
          rootDestinationId: 'dest-root',
          facts: {},
          progress: { manualCompletedStepIds: ['step-a'], externalOutcomeCompletedStepIds: [], satisfiedRequirementIds: [] },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    adapter.write(PERSISTENCE_STORAGE_KEY, JSON.stringify(saved));

    const result = resumePersistedState(adapter, 'hash-new', contentIndex(), NOW);

    expect(result.reason).toBe('revalidatedContentChange');
    expect(result.envelope.contentVersion).toBe('hash-new');
    const persisted = adapter.read(PERSISTENCE_STORAGE_KEY);
    expect(persisted).toBeDefined();
    expect(JSON.parse(persisted as string).contentVersion).toBe('hash-new');
  });

  it('resets and persists a fresh envelope for malformed JSON', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(PERSISTENCE_STORAGE_KEY, '{not json');

    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);

    expect(result.reason).toBe('resetMalformedJson');
    expect(result.envelope.sessions).toEqual([]);
  });

  it('resets and persists a fresh envelope for an unsupported schema version', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(PERSISTENCE_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, contentVersion: 'x', updatedAt: NOW, sessions: [] }));

    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);

    expect(result.reason).toBe('resetUnsupportedVersion');
    expect(result.envelope.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('falls back to a safe, unsaved-but-usable fresh envelope when storage is unavailable', () => {
    const adapter = new FailingStorageAdapter();

    expect(() => resumePersistedState(adapter, 'hash-current', contentIndex(), NOW)).not.toThrow();
    const result = resumePersistedState(adapter, 'hash-current', contentIndex(), NOW);

    expect(result.envelope.sessions).toEqual([]);
    expect(result.envelope.contentVersion).toBe('hash-current');
  });
});
