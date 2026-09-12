/**
 * Minimal synchronous key-value boundary the persisted-state logic depends
 * on, so migration/revalidation logic (state.ts) can be tested against a
 * plain in-memory implementation without a real browser. `read`/`write`
 * return explicit results so absence can never be confused with failure.
 * A storage failure (quota exceeded, disabled storage, a browser privacy
 * mode) is a value the caller handles, never an uncaught exception.
 */
export type StorageReadResult =
  | { readonly status: 'found'; readonly value: string }
  | { readonly status: 'missing' }
  | { readonly status: 'unavailable'; readonly reason: string };

export type StorageMutationResult =
  | { readonly status: 'ok' }
  | { readonly status: 'unavailable'; readonly reason: string };

export interface StorageAdapter {
  read(key: string): StorageReadResult;
  write(key: string, value: string): StorageMutationResult;
  remove(key: string): StorageMutationResult;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  read(key: string): StorageReadResult {
    const value = this.store.get(key);
    return value === undefined ? { status: 'missing' } : { status: 'found', value };
  }

  write(key: string, value: string): StorageMutationResult {
    this.store.set(key, value);
    return { status: 'ok' };
  }

  remove(key: string): StorageMutationResult {
    this.store.delete(key);
    return { status: 'ok' };
  }
}
