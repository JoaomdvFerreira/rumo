import { z } from 'zod';

import { entityIdSchema } from './identifiers';

/**
 * SourceDefinition describes *what* an authoritative source is.
 * SourceVerification describes *when/how it was last checked*.
 * These are deliberately separate contracts (see docs/architecture/guardrails.md):
 * a source can be defined without yet being verified, and verification
 * history must be able to evolve independently of the source's identity.
 */

export const sourceDefinitionSchema = z.object({
  id: entityIdSchema,
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  jurisdiction: z.string().min(1),
});

export type SourceDefinition = z.infer<typeof sourceDefinitionSchema>;

export const sourceVerificationStatusSchema = z.enum(['verified', 'stale', 'unverified']);

export const sourceVerificationSchema = z.object({
  sourceId: entityIdSchema,
  status: sourceVerificationStatusSchema,
  checkedAt: z.iso.datetime(),
  checkedBy: z.string().min(1),
});

export type SourceVerification = z.infer<typeof sourceVerificationSchema>;
