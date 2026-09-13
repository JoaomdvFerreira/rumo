# Versioning

Version the application, canonical content, and persisted-state schema independently. Content has a deterministic hash. When content changes, persisted state is revalidated against the new content version before it is trusted or resumed.

## Persisted schema version vs content version

Two independent version numbers travel with every persisted envelope (`src/persistence/schema.ts`):

- `schemaVersion` — the shape of the persisted envelope itself (`PersistedStateEnvelope`, `PersistedSession`, `PersistedRuntimeProgress`). It changes only when the persistence layer's own contract changes, independent of product content.
- `contentVersion` — the canonical content the persisted progress was last resolved against. Its current value is the canonical `contentHash` (`src/content/hash.ts`), the deterministic SHA-256 hash of the canonical content graph.

A schema migration and a content-version revalidation are different concerns and are never conflated: an envelope can require a schema migration while its content version still matches current content, or vice versa.

## Migration and reset policy

On load (`src/persistence/state.ts`), persisted data is classified as valid, absent, malformed JSON, schema-invalid, unsupported, or storage-unavailable. Schema v2 is current. Schema v1 is explicitly migrated by retaining each session, its root Destination, timestamps, and compatible structured facts while discarding its bare-id progress: v1 contains no semantic fingerprints, so compatibility cannot be proved. Malformed JSON, schema-invalid data, and unsupported versions trigger an explicit reset to a fresh envelope stamped with the current content version.

Read, write, and remove use typed results, so absence remains distinct from failure and every storage failure is non-throwing. Resume exposes `persistenceStatus` as `persisted` or `unavailable`; an envelope may remain usable in memory without being represented as successfully resumable.

## Content-version mismatch and revalidation

A saved session whose `contentVersion` differs from the current canonical `contentHash` is never blindly restored as current. Every persisted completion or satisfaction carries a deterministic semantic fingerprint. Step fingerprints include the Step plus its Route, RouteVariant, and Destination placement; Requirement fingerprints include the Requirement plus its group, Step, and routing wiring.

`src/persistence/revalidate.ts` preserves progress only when the current fingerprint matches and the entity remains structurally reachable from the session's root Destination, including compatible subjourneys. Same-id semantic changes, moved or irrelevant entities, and removed ids are discarded conservatively. A deleted root Destination discards the session, while compatible structured facts remain. The envelope is then stamped with the current `contentVersion`.

## Browser-local, no-login boundary

Persisted state lives only in the browser's `localStorage`, behind the typed `StorageAdapter` interface (`src/persistence/storageAdapter.ts`). There is no database, no authentication, and no server-side persistence. The hydration boundary (`src/persistence/react/useHydratedSession.ts`) returns the stable `loading` snapshot during server rendering and the first client hydration render. A post-mount effect then performs storage load, migration, revalidation, reset/save as needed, and publishes `ready` or `unavailable`; `getSnapshot` itself performs no storage I/O or mutation.

## No raw free-text persistence

The persisted envelope stores canonical ids and semantic fingerprints, typed fact values (strings, numbers, booleans, or arrays thereof, per the domain `FactSet` contract), and timestamps. Arbitrary raw user-entered free text must never be placed into persisted facts. No raw query/answer text field exists.
