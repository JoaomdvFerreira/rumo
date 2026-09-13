import { afterEach, describe, expect, it, vi } from 'vitest';

import { isLocalStorageAvailable, LocalStorageAdapter } from './localStorageAdapter';

/**
 * This suite runs under vitest's default `node` test environment (see
 * vitest.config.ts), where `window` is undefined -- exactly the server
 * rendering environment the hydration boundary must never touch browser
 * storage from (docs/architecture/guardrails.md). Asserting these calls
 * are safe here is a direct proof that the server-side code path does not
 * access browser storage: if it did, these would throw ReferenceError.
 */
describe('LocalStorageAdapter on a server-like (no window) environment', () => {
  it('reports storage as unavailable rather than throwing', () => {
    expect(() => isLocalStorageAvailable()).not.toThrow();
    expect(isLocalStorageAvailable()).toBe(false);
  });

  it('read/write/remove fail safely instead of throwing ReferenceError', () => {
    const adapter = new LocalStorageAdapter();

    expect(() => adapter.read('any-key')).not.toThrow();
    expect(adapter.read('any-key').status).toBe('unavailable');

    expect(() => adapter.write('any-key', 'value')).not.toThrow();
    expect(adapter.write('any-key', 'value').status).toBe('unavailable');

    expect(() => adapter.remove('any-key')).not.toThrow();
    expect(adapter.remove('any-key').status).toBe('unavailable');
  });
});

describe('LocalStorageAdapter with throwing browser storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns typed failures for read, write, and remove without throwing', () => {
    const fail = () => {
      throw new Error('browser storage blocked');
    };
    vi.stubGlobal('window', {
      localStorage: { getItem: fail, setItem: fail, removeItem: fail },
    });
    const adapter = new LocalStorageAdapter();

    expect(adapter.read('key')).toEqual({ status: 'unavailable', reason: 'browser storage blocked' });
    expect(adapter.write('key', 'value')).toEqual({ status: 'unavailable', reason: 'browser storage blocked' });
    expect(adapter.remove('key')).toEqual({ status: 'unavailable', reason: 'browser storage blocked' });
  });
});
