/**
 * Minimal synchronous key-value boundary the persisted-state logic depends
 * on, so migration/revalidation logic (state.ts) can be tested against a
 * plain in-memory implementation without a real browser. `read`/`write`
 * return `undefined`/`false` on failure instead of throwing, so a storage
 * failure (quota exceeded, disabled storage, a browser privacy mode) is a
 * value the caller handles, never an uncaught exception that crashes the
 * application.
 */
export interface StorageAdapter {
  read(key: string): string | undefined;
  write(key: string, value: string): boolean;
  remove(key: string): void;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  read(key: string): string | undefined {
    return this.store.get(key);
  }

  write(key: string, value: string): boolean {
    this.store.set(key, value);
    return true;
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}
