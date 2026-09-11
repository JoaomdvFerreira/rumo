import { z } from 'zod';

import { conditionSchema } from './condition';
import { entityIdSchema } from './identifiers';

/**
 * A Requirement is a discrete condition of eligibility or obligation
 * (a document, a status, a prerequisite fact). `appliesWhen` scopes the
 * requirement declaratively so routing never needs bespoke branching code.
 */
export const requirementSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  appliesWhen: conditionSchema.optional(),
  decisionReferenceIds: z.array(entityIdSchema).default([]),
});

export type Requirement = z.infer<typeof requirementSchema>;
