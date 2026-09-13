import { z } from 'zod';

import { entityIdSchema } from './identifiers';

/**
 * A DecisionReference points at the authoritative basis (law, regulation,
 * municipal ruling) that justifies a requirement or step existing at all.
 * It carries provenance, not the decision logic itself -- decision logic
 * is expressed only through the Condition AST. A decision can be
 * corroborated by more than one source, so provenance is a non-empty
 * array rather than a single id.
 */
export const decisionReferenceSchema = z.strictObject({
  id: entityIdSchema,
  sourceIds: z.array(entityIdSchema).min(1),
  summary: z.string().min(1),
  citation: z.string().min(1).optional(),
});

export type DecisionReference = z.infer<typeof decisionReferenceSchema>;
