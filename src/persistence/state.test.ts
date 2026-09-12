import { describe, expect, it } from 'vitest';

import { createEmptyEnvelope, loadPersistedState, PERSISTENCE_STORAGE_KEY, resetPersistedState, savePersistedState } from './state';
import { InMemoryStorageAdapter } from './storageAdapter';
import type { StorageAdapter } from './storageAdapter';
import { CURRENT_SCHEMA_VERSION } from './schema';
import type { PersistedStateEnvelope } from './schema';

function envelope(overrides: Partial<PersistedStateEnvelope> = {}): PersistedStateEnvelope {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    contentVersion: 'hash-a',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sessions: [],
    ...overrides,
  };
}

/** A StorageAdapter whose operations always fail, for storage-unavailable coverage. */
class FailingStorageAdapter implements StorageAdapter {
  read(): string | undefined {
    throw new Error('storage disabled');
  }
  write(): boolean {
    return false;
  }
  remove(): void {
    throw new Error('storage disabled');
  }
}

describe('loadPersistedState / savePersistedState', () => {
  it('round-trips a valid current-version envelope', () => {
    const adapter = new InMemoryStorageAdapter();
    const state = envelope({ sessions: [] });

    expect(savePersistedState(adapter, state)).toEqual({ status: 'ok' });
    expect(loadPersistedState(adapter)).toEqual({ status: 'ok', state });
  });

  it('reports empty when nothing has been saved', () => {
    const adapter = new InMemoryStorageAdapter();
    expect(loadPersistedState(adapter)).toEqual({ status: 'empty' });
  });

  it('reports malformedJson for unparsable stored content', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(PERSISTENCE_STORAGE_KEY, '{not json');

    const outcome = loadPersistedState(adapter);
    expect(outcome.status).toBe('malformedJson');
  });

  it('reports invalidSchema for structurally-valid JSON that fails the envelope schema', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(
      PERSISTENCE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, contentVersion: 'x', sessions: 'not-an-array' }),
    );

    const outcome = loadPersistedState(adapter);
    expect(outcome.status).toBe('invalidSchema');
  });

  it('reports unsupportedVersion for a schemaVersion this build does not know', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(
      PERSISTENCE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 999, contentVersion: 'x', updatedAt: '2026-01-01T00:00:00.000Z', sessions: [] }),
    );

    const outcome = loadPersistedState(adapter);
    expect(outcome).toEqual({ status: 'unsupportedVersion', foundVersion: 999 });
  });

  it('reports unsupportedVersion when schemaVersion is missing entirely', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(PERSISTENCE_STORAGE_KEY, JSON.stringify({ contentVersion: 'x', sessions: [] }));

    const outcome = loadPersistedState(adapter);
    expect(outcome).toEqual({ status: 'unsupportedVersion', foundVersion: undefined });
  });

  it('never throws when the adapter read fails, and reports storageUnavailable', () => {
    const adapter = new FailingStorageAdapter();
    expect(() => loadPersistedState(adapter)).not.toThrow();
    const outcome = loadPersistedState(adapter);
    expect(outcome.status).toBe('storageUnavailable');
  });

  it('never throws when the adapter write fails, and reports storageUnavailable', () => {
    const adapter = new FailingStorageAdapter();
    expect(() => savePersistedState(adapter, envelope())).not.toThrow();
    expect(savePersistedState(adapter, envelope()).status).toBe('storageUnavailable');
  });

  it('does not silently reinterpret an incompatible structure as valid state', () => {
    const adapter = new InMemoryStorageAdapter();
    adapter.write(PERSISTENCE_STORAGE_KEY, JSON.stringify({ totally: 'unrelated', shape: true }));

    const outcome = loadPersistedState(adapter);
    expect(outcome.status).not.toBe('ok');
  });
});

describe('resetPersistedState', () => {
  it('clears any previously persisted state', () => {
    const adapter = new InMemoryStorageAdapter();
    savePersistedState(adapter, envelope());
    expect(loadPersistedState(adapter).status).toBe('ok');

    resetPersistedState(adapter);

    expect(loadPersistedState(adapter)).toEqual({ status: 'empty' });
  });

  it('never throws even when the adapter cannot remove the key', () => {
    const adapter = new FailingStorageAdapter();
    expect(() => resetPersistedState(adapter)).not.toThrow();
  });
});

describe('createEmptyEnvelope', () => {
  it('produces a schema-valid empty envelope stamped with the given content version', () => {
    const fresh = createEmptyEnvelope('hash-b', '2026-02-02T00:00:00.000Z');
    expect(fresh).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      contentVersion: 'hash-b',
      updatedAt: '2026-02-02T00:00:00.000Z',
      sessions: [],
    });
  });
});
