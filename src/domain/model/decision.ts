import { z } from 'zod';

import { entityIdSchema } from './identifiers';

/**
 * A DecisionReference points at the authoritative basis (law, regulation,
 * municipal ruling) that justifies a requirement or step existing at all.
 * It carries provenance, not the decision logic itself -- decision logic
 * is expressed only through the Condition AST.
 */
export const decisionReferenceSchema = z.object({
  id: entityIdSchema,
  sourceId: entityIdSchema,
  summary: z.string().min(1),
  citation: z.string().min(1).optional(),
});

export type DecisionReference = z.infer<typeof decisionReferenceSchema>;
