import { z } from 'zod';

import { factSetSchema } from '../domain/model/fact';
import { entityIdSchema } from '../domain/model/identifiers';

/**
 * Persisted-state contract (docs/governance/versioning.md): a versioned,
 * browser-local envelope. `schemaVersion` tracks the shape of this envelope
 * itself; `contentVersion` tracks the canonical content the persisted
 * progress was resolved against (the current canonical value is
 * `contentHash`, see src/content/hash.ts). The two evolve independently --
 * a schema migration and a content revalidation are different concerns.
 *
 * Only typed/structured runtime state required to resume the product is
 * persisted here. Facts use the domain FactSet contract; callers must
 * never put arbitrary raw user-entered free text into those structured
 * canonical values.
 */
export const CURRENT_SCHEMA_VERSION = 2 as const;

/**
 * Mirrors engine/runtime.ts `RuntimeProgress`, serialized as arrays (Zod/JSON
 * have no Set type) rather than a parallel hand-rolled shape. This is the
 * only progress representation persisted -- it must stay the sole source of
 * routing-state truth so a second competing model can never be introduced.
 *
 * Each completed/satisfied id is paired with the semantic fingerprint
 * (src/persistence/fingerprint.ts) of the canonical entity it referred to
 * at the moment progress was recorded. A bare id is not proof that
 * progress against it is still valid: the id can persist globally while
 * its applicability, requirements, dependencies, completion mode, or
 * reachability from this session's root Destination change entirely.
 * Revalidation (revalidate.ts) trusts an entry only when both the id
 * exists AND its current fingerprint matches the persisted one.
 */
export const progressEntrySchema = z.strictObject({
  id: entityIdSchema,
  fingerprint: z.string().min(1),
});

export type PersistedProgressEntry = z.infer<typeof progressEntrySchema>;

export const persistedRuntimeProgressSchema = z.strictObject({
  manualCompletedStepIds: z.array(progressEntrySchema).default([]),
  externalOutcomeCompletedStepIds: z.array(progressEntrySchema).default([]),
  satisfiedRequirementIds: z.array(progressEntrySchema).default([]),
});

export type PersistedRuntimeProgress = z.infer<typeof persistedRuntimeProgressSchema>;

/**
 * A Session is one in-progress resolution of a root Destination. Progress is
 * a single flat RuntimeProgress (matching engine/destination.ts, which
 * derives parent/child subjourney state entirely from the child
 * Destination's own resolution rather than from separately stored
 * per-subjourney progress) -- so root and subjourney completion share one
 * progress set keyed by step/requirement id, and resuming never loses
 * parent/child state because there is only ever one state to lose.
 */
export const persistedSessionSchema = z.strictObject({
  id: entityIdSchema,
  rootDestinationId: entityIdSchema,
  facts: factSetSchema.default({}),
  progress: persistedRuntimeProgressSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PersistedSession = z.infer<typeof persistedSessionSchema>;

export const persistedStateEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  contentVersion: z.string().min(1),
  updatedAt: z.iso.datetime(),
  sessions: z.array(persistedSessionSchema).default([]),
});

export type PersistedStateEnvelope = z.infer<typeof persistedStateEnvelopeSchema>;

/** Schema v1 is retained only as an explicit migration input. */
export const persistedStateEnvelopeV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  updatedAt: z.iso.datetime(),
  sessions: z.array(
    z.strictObject({
      id: entityIdSchema,
      rootDestinationId: entityIdSchema,
      facts: factSetSchema.default({}),
      progress: z.strictObject({
        manualCompletedStepIds: z.array(entityIdSchema).default([]),
        externalOutcomeCompletedStepIds: z.array(entityIdSchema).default([]),
        satisfiedRequirementIds: z.array(entityIdSchema).default([]),
      }),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    }),
  ).default([]),
});
