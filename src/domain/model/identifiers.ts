import { z } from 'zod';

/**
 * Shared identifier and provenance primitives used across domain contracts.
 * Kept separate so every canonical entity references the same shapes.
 */

export const entityIdSchema = z.string().min(1);

export const contentVersionSchema = z.object({
  contentHash: z.string().min(1),
  publishedAt: z.iso.datetime(),
});

export type ContentVersion = z.infer<typeof contentVersionSchema>;
