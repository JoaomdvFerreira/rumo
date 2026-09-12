import type { StorageAdapter } from './storageAdapter';

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
  read(key: string): string | undefined {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? undefined : value;
    } catch {
      return undefined;
    }
  }

  write(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // A remove failure leaves stale data in place; callers already treat
      // load failures as untrusted, so this is safe to ignore.
    }
  }
}

/**
 * `true` only in an environment where `window.localStorage` can plausibly be
 * used. Never called during server rendering (see hydration.ts) -- this is
 * a defensive guard for browsers that expose `window` but disable storage,
 * not a substitute for the client/server boundary.
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
