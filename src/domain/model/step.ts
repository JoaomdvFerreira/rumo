import { z } from 'zod';

import { conditionSchema } from './condition';
import { entityIdSchema } from './identifiers';

/**
 * A Step has exactly one of three semantics:
 * - task: something the user can execute now (possibly via a provider/channel).
 * - wait: a passive period with no user action (e.g. processing time).
 * - subjourney: a reference to a nested journey the user must complete.
 *
 * Routing (WU003) decides actionability from these semantics; this contract
 * only declares them. A step is never independently "blocked" -- blocking
 * is derived at routing time from unmet requirements/conditions, not stored
 * as step state here.
 *
 * `dependsOnStepIds` and `priority` are declared here so canonical content
 * can express step ordering/precedence; WU003 defines and tests the actual
 * priority-selection and dependency-resolution semantics.
 *
 * Each kind also declares its `completion` semantic -- how the step comes
 * to be considered done -- without storing any completion state or
 * processing outcomes; that belongs to WU003/WU005.
 */

export const completionModeSchema = z.enum(['manual', 'externalOutcome', 'subjourney']);

const stepBaseSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  requirementIds: z.array(entityIdSchema).default([]),
  requirementGroupIds: z.array(entityIdSchema).default([]),
  appliesWhen: conditionSchema.optional(),
  dependsOnStepIds: z.array(entityIdSchema).default([]),
  priority: z.number().int().nonnegative().default(0),
});

const taskStepSchema = stepBaseSchema.extend({
  kind: z.literal('task'),
  providerId: entityIdSchema.optional(),
  channelId: entityIdSchema.optional(),
  completion: z.enum(['manual', 'externalOutcome']).default('manual'),
});

const waitStepSchema = stepBaseSchema.extend({
  kind: z.literal('wait'),
  estimatedDurationDays: z.number().int().nonnegative().optional(),
  completion: z.literal('externalOutcome').default('externalOutcome'),
});

const subjourneyStepSchema = stepBaseSchema.extend({
  kind: z.literal('subjourney'),
  journeyId: entityIdSchema,
  completion: z.literal('subjourney').default('subjourney'),
});

export const stepSchema = z.discriminatedUnion('kind', [
  taskStepSchema,
  waitStepSchema,
  subjourneyStepSchema,
]);

export type TaskStep = z.infer<typeof taskStepSchema>;
export type WaitStep = z.infer<typeof waitStepSchema>;
export type SubjourneyStep = z.infer<typeof subjourneyStepSchema>;
export type Step = z.infer<typeof stepSchema>;
