import type { StorageAdapter, StorageMutationResult, StorageReadResult } from './storageAdapter';

/**
 * Browser localStorage implementation of `StorageAdapter`. This is the only
 * module in the persistence layer allowed to reference `window`/
 * `localStorage` directly; every other module operates on the
 * `StorageAdapter` interface so migration/revalidation logic can be tested
 * without a real browser (docs/architecture/guardrails.md: respect the
 * Next.js/localStorage hydration boundary).
 *
 * All operations are wrapped: `localStorage` can throw (disabled storage,
 * quota exceeded, a privacy mode that blocks storage entirely, or simply
 * being unavailable during server rendering) and a storage failure must
 * never crash the application.
 */
export class LocalStorageAdapter implements StorageAdapter {
  read(key: string): StorageReadResult {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? { status: 'missing' } : { status: 'found', value };
    } catch (error) {
      return { status: 'unavailable', reason: describeError(error) };
    }
  }

  write(key: string, value: string): StorageMutationResult {
    try {
      window.localStorage.setItem(key, value);
      return { status: 'ok' };
    } catch (error) {
      return { status: 'unavailable', reason: describeError(error) };
    }
  }

  remove(key: string): StorageMutationResult {
    try {
      window.localStorage.removeItem(key);
      return { status: 'ok' };
    } catch (error) {
      return { status: 'unavailable', reason: describeError(error) };
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Optional browser capability probe. The hydration boundary does not use it
 * as a correctness signal: every read/write/remove still returns its own
 * typed result because storage may fail after a successful probe. Callers
 * must invoke this only after mount, never from render or getSnapshot.
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__rumo_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
