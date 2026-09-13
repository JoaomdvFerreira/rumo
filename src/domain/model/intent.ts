import { z } from 'zod';

import { factSetSchema, type FactSet } from './fact';
import { entityIdSchema } from './identifiers';

/** Repository-controlled phrase that can resolve to a canonical Destination. */
export const aliasDefinitionSchema = z.strictObject({
  id: entityIdSchema,
  phrase: z.string().trim().min(1),
  kind: z.enum(['intent', 'alias']),
  extractedFacts: factSetSchema.optional(),
});

export type AliasDefinition = z.infer<typeof aliasDefinitionSchema>;

/** Search intent. It points at, but never duplicates, a canonical Destination. */
export const intentDefinitionSchema = z.strictObject({
  id: entityIdSchema,
  destinationId: entityIdSchema,
  aliases: z.array(aliasDefinitionSchema).min(1),
});

export type IntentDefinition = z.infer<typeof intentDefinitionSchema>;

export const intentCatalogSchema = z.array(intentDefinitionSchema);

export type IntentCatalog = z.infer<typeof intentCatalogSchema>;

export const intentConfidenceSchema = z.enum(['high', 'medium']);
export type IntentConfidence = z.infer<typeof intentConfidenceSchema>;

export interface IntentMatchEvidence {
  readonly intentId: string;
  readonly aliasId: string;
  readonly kind: AliasDefinition['kind'];
  readonly phrase: string;
}

/** Safe handoff from search to routing/UI. It deliberately contains no prose. */
export interface IntentCandidate {
  readonly destinationId: string;
  readonly score: number;
  readonly confidence: IntentConfidence;
  readonly evidence: IntentMatchEvidence;
  readonly facts: FactSet;
}
