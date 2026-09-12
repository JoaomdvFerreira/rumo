import {
  CURRENT_SCHEMA_VERSION,
  persistedStateEnvelopeSchema,
  type PersistedStateEnvelope,
} from './schema';
import type { StorageAdapter } from './storageAdapter';

export const PERSISTENCE_STORAGE_KEY = 'rumo.persistedState';

export type LoadStateOutcome =
  | { readonly status: 'empty' }
  | { readonly status: 'ok'; readonly state: PersistedStateEnvelope }
  | { readonly status: 'malformedJson'; readonly reason: string }
  | { readonly status: 'invalidSchema'; readonly reason: string }
  | { readonly status: 'unsupportedVersion'; readonly foundVersion: number | undefined }
  | { readonly status: 'storageUnavailable'; readonly reason: string };

/**
 * Reads and validates persisted state without ever throwing: malformed
 * JSON, schema-invalid data, and unsupported schema versions are reported
 * as distinct outcomes rather than crashing the caller or being silently
 * reinterpreted as something they are not. A `StorageAdapter.read` failure
 * (adapter unavailable, threw internally and was caught by the adapter) is
 * likewise a value, not an exception.
 */
export function loadPersistedState(adapter: StorageAdapter): LoadStateOutcome {
  let raw: string | undefined;
  try {
    raw = adapter.read(PERSISTENCE_STORAGE_KEY);
  } catch (error) {
    return { status: 'storageUnavailable', reason: describeError(error) };
  }

  if (raw === undefined) {
    return { status: 'empty' };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch (error) {
    return { status: 'malformedJson', reason: describeError(error) };
  }

  const migrated = migrateEnvelope(candidate);
  if (migrated.status === 'unsupportedVersion') {
    return migrated;
  }

  const result = persistedStateEnvelopeSchema.safeParse(migrated.candidate);
  if (!result.success) {
    return { status: 'invalidSchema', reason: result.error.message };
  }

  return { status: 'ok', state: result.data };
}

type MigrationOutcome =
  | { readonly status: 'migrated'; readonly candidate: unknown }
  | { readonly status: 'unsupportedVersion'; readonly foundVersion: number | undefined };

/**
 * Explicit migration ladder keyed by the persisted `schemaVersion`. There is
 * currently only one supported version (1), so migration is the identity
 * transform for it; any other declared version -- including a future one
 * this build predates -- is unsupported and must trigger a safe reset
 * rather than a best-effort reinterpretation of an incompatible shape.
 */
function migrateEnvelope(candidate: unknown): MigrationOutcome {
  if (typeof candidate !== 'object' || candidate === null || !('schemaVersion' in candidate)) {
    return { status: 'unsupportedVersion', foundVersion: undefined };
  }

  const foundVersion = (candidate as { schemaVersion: unknown }).schemaVersion;
  if (foundVersion === CURRENT_SCHEMA_VERSION) {
    return { status: 'migrated', candidate };
  }

  return {
    status: 'unsupportedVersion',
    foundVersion: typeof foundVersion === 'number' ? foundVersion : undefined,
  };
}

export type SaveStateOutcome = { readonly status: 'ok' } | { readonly status: 'storageUnavailable'; readonly reason: string };

export function savePersistedState(adapter: StorageAdapter, state: PersistedStateEnvelope): SaveStateOutcome {
  const parsed = persistedStateEnvelopeSchema.parse(state);
  try {
    const ok = adapter.write(PERSISTENCE_STORAGE_KEY, JSON.stringify(parsed));
    if (!ok) {
      return { status: 'storageUnavailable', reason: 'adapter reported write failure' };
    }
    return { status: 'ok' };
  } catch (error) {
    return { status: 'storageUnavailable', reason: describeError(error) };
  }
}

/**
 * Explicit reset: used whenever persisted data cannot be trusted (malformed
 * JSON, schema-invalid, unsupported version) and no migration applies.
 * Never partially reinterprets the incompatible structure.
 */
export function resetPersistedState(adapter: StorageAdapter): void {
  try {
    adapter.remove(PERSISTENCE_STORAGE_KEY);
  } catch {
    // Best-effort: an adapter that cannot remove a key still leaves the
    // application free to proceed with a fresh in-memory envelope.
  }
}

export function createEmptyEnvelope(contentVersion: string, now: string): PersistedStateEnvelope {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    contentVersion,
    updatedAt: now,
    sessions: [],
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
