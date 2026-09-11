import { z } from 'zod';

import { conditionSchema } from './condition';
import { entityIdSchema } from './identifiers';

/**
 * Canonical routing-container model. These contracts freeze the minimum
 * vocabulary WU003 must consume for route/variant selection: they declare
 * structure and defaults only. Condition evaluation, route selection,
 * variant selection, and dependency resolution are explicitly out of
 * scope here and belong to WU003. Cross-reference existence (that every
 * referenced id resolves to a real entity) is a WU004 `content:check`
 * concern, not validated by these schemas.
 */

/**
 * A LifeEvent identifies a life-event family (e.g. "moving home") and the
 * Destinations available within it.
 */
export const lifeEventSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  destinationIds: z.array(entityIdSchema).min(1),
});

export type LifeEvent = z.infer<typeof lifeEventSchema>;

/**
 * A Destination is a concrete outcome within a LifeEvent (e.g. "register a
 * new address") reachable via one or more Routes.
 */
export const destinationSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  routeIds: z.array(entityIdSchema).min(1),
});

export type Destination = z.infer<typeof destinationSchema>;

/**
 * A Route is one applicable path to a Destination: an ordered set of Step
 * ids, gated by an optional Condition, with a priority WU003 uses for
 * deterministic selection when more than one Route applies. Selection
 * logic itself is not implemented here.
 */
export const routeSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  appliesWhen: conditionSchema.optional(),
  priority: z.number().int().nonnegative().default(0),
  stepIds: z.array(entityIdSchema).min(1),
  variantIds: z.array(entityIdSchema).default([]),
});

export type Route = z.infer<typeof routeSchema>;

/**
 * A RouteVariant is an alternate, complete Step sequence for its parent
 * Route when its own Condition applies. Unlike Route, `appliesWhen` is
 * required: a variant with no condition would be indistinguishable from
 * its parent Route's default sequence. Deterministic variant-selection
 * behavior is defined and tested in WU003.
 */
export const routeVariantSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  appliesWhen: conditionSchema,
  priority: z.number().int().nonnegative().default(0),
  stepIds: z.array(entityIdSchema).min(1),
});

export type RouteVariant = z.infer<typeof routeVariantSchema>;
