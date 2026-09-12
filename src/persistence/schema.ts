import { z } from 'zod';

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
 * persisted here. There is no free-text field anywhere in this contract:
 * every value is an id, a set of ids, or a timestamp.
 */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/**
 * Mirrors engine/runtime.ts `RuntimeProgress`, serialized as arrays (Zod/JSON
 * have no Set type) rather than a parallel hand-rolled shape. This is the
 * only progress representation persisted -- it must stay the sole source of
 * routing-state truth so a second competing model can never be introduced.
 */
export const persistedRuntimeProgressSchema = z.strictObject({
  manualCompletedStepIds: z.array(entityIdSchema).default([]),
  externalOutcomeCompletedStepIds: z.array(entityIdSchema).default([]),
  satisfiedRequirementIds: z.array(entityIdSchema).default([]),
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
  facts: z.record(z.string().min(1), z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))])).default({}),
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
