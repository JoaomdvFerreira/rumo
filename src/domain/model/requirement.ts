import { z } from 'zod';

import { conditionSchema } from './condition';
import { entityIdSchema } from './identifiers';

/**
 * A Requirement is a discrete condition of eligibility or obligation
 * (a document, a status, a prerequisite fact). `appliesWhen` scopes the
 * requirement declaratively so routing never needs bespoke branching code.
 */
export const requirementSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  appliesWhen: conditionSchema.optional(),
  decisionReferenceIds: z.array(entityIdSchema).default([]),
});

export type Requirement = z.infer<typeof requirementSchema>;

/**
 * A RequirementGroup expresses allOf/anyOf composition over requirement
 * ids, so a Step can depend on a group without collapsing group semantics
 * into the Condition AST. Cross-reference existence (that each id actually
 * resolves to a known Requirement) is a WU004 `content:check` concern, not
 * validated here.
 */
export const requirementGroupModeSchema = z.enum(['allOf', 'anyOf']);

export const requirementGroupSchema = z.strictObject({
  id: entityIdSchema,
  mode: requirementGroupModeSchema,
  requirementIds: z.array(entityIdSchema).min(1),
});

export type RequirementGroup = z.infer<typeof requirementGroupSchema>;
