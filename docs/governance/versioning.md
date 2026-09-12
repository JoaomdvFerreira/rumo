# Versioning

Version the application, canonical content, and persisted-state schema independently. Content has a deterministic hash. When content changes, persisted state is revalidated against the new content version before it is trusted or resumed.

## Persisted schema version vs content version

Two independent version numbers travel with every persisted envelope (`src/persistence/schema.ts`):

- `schemaVersion` — the shape of the persisted envelope itself (`PersistedStateEnvelope`, `PersistedSession`, `PersistedRuntimeProgress`). It changes only when the persistence layer's own contract changes, independent of any product content.
- `contentVersion` — the canonical content the persisted progress was last resolved against. Its current value is the canonical `contentHash` (`src/content/hash.ts`), the deterministic SHA-256 hash of the canonical content graph.

A schema migration and a content-version revalidation are different concerns and are never conflated: the envelope can require a schema migration while its content version still matches current content, or vice versa.

## Migration and reset policy

On load (`src/persistence/state.ts`), persisted data is classified into exactly one of: valid current-version state, malformed JSON, schema-invalid data, or an unsupported `schemaVersion`. Only a `schemaVersion` this build explicitly recognizes is migrated; there is currently one supported version, so migration is the identity transform for it. Malformed JSON, schema-invalid data, and any other declared `schemaVersion` are never partially reinterpreted — they trigger an explicit reset to a fresh, empty envelope stamped with the current content version. Storage read/write failures (unavailable, disabled, or throwing storage) are handled the same way: a safe, unsaved-but-usable in-memory envelope, never a crash.

## Content-version mismatch and revalidation

A saved session whose `contentVersion` differs from the current canonical `contentHash` is never blindly restored as current. `src/persistence/revalidate.ts` deterministically rebuilds it against current content: a session is discarded entirely if its root Destination no longer exists; otherwise, step and requirement ids in its progress are preserved only if they still exist in current content, and any id that no longer resolves is dropped rather than trusted. After successful revalidation, the envelope is re-stamped with the current `contentVersion`.

## Browser-local, no-login boundary

Persisted state lives only in the browser's `localStorage`, behind the `StorageAdapter` interface (`src/persistence/storageAdapter.ts`). There is no database, no authentication, and no server-side persistence — the hydration boundary (`src/persistence/react/useHydratedSession.ts`) guarantees `localStorage` is never read during server rendering or the client's initial hydration pass, so no user-specific state is ever embedded in server HTML.

## No raw free-text persistence

The persisted envelope stores only ids (steps, requirements, destinations, sessions), typed fact values (string/number/boolean or arrays thereof, per `src/domain/model/fact.ts`), and timestamps. No arbitrary user-entered free text is ever persisted.
