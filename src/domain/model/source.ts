import { z } from 'zod';

import { entityIdSchema } from './identifiers';

/**
 * SourceDefinition describes *what* an authoritative source is: its
 * identity, role in the content graph (`kind`), and inherent freshness
 * risk. It carries no mutable observations -- those belong exclusively to
 * SourceVerification (see docs/architecture/guardrails.md): a source can be
 * defined without yet being verified, and verification history must be
 * able to evolve independently of the source's identity.
 */

export const sourceKindSchema = z.enum(['action', 'evidence', 'fallback']);

export const sourceFreshnessRiskSchema = z.enum(['low', 'medium', 'high']);

export const sourceDefinitionSchema = z.strictObject({
  id: entityIdSchema,
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  jurisdiction: z.string().min(1),
  kind: sourceKindSchema,
  freshnessRisk: sourceFreshnessRiskSchema,
  supports: z.array(entityIdSchema).default([]),
  caution: z.string().min(1).optional(),
});

export type SourceDefinition = z.infer<typeof sourceDefinitionSchema>;

/**
 * SourceVerification represents a point-in-time observation of a source.
 * Link health (is the URL reachable) and content freshness (is what it
 * says still current) are independent dimensions and are tracked
 * separately rather than collapsed into one generic status. No crawling
 * or freshness calculation happens here -- those are later WUs.
 */

export const linkHealthSchema = z.enum(['ok', 'degraded', 'broken']);

export const contentFreshnessSchema = z.enum(['current', 'stale', 'unknown']);

export const sourceVerificationSchema = z.strictObject({
  sourceId: entityIdSchema,
  checkedAt: z.iso.datetime(),
  checkedBy: z.string().min(1),
  linkHealth: linkHealthSchema,
  contentFreshness: contentFreshnessSchema,
  httpStatus: z.number().int().nonnegative().optional(),
  finalUrl: z.url().optional(),
  contentHash: z.string().min(1).optional(),
  contentReviewedAt: z.iso.datetime().optional(),
});

export type SourceVerification = z.infer<typeof sourceVerificationSchema>;
