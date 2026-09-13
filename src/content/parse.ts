import { z } from 'zod';

import { contentGraphSchema } from './graph';
import type { ContentGraph } from './graph';

export interface ContentParseFailure {
  readonly success: false;
  readonly error: z.ZodError;
}

export interface ContentParseSuccess {
  readonly success: true;
  readonly content: ContentGraph;
}

export type ContentParseResult = ContentParseSuccess | ContentParseFailure;

/**
 * Validates an assembled content package against the canonical entity
 * schemas (WU002). This is shape-level validation only -- cross-entity
 * reference integrity, condition well-formedness, and source/freshness
 * checks are `content:check` concerns (see validate.ts), not this parser's.
 */
export function parseContentGraph(candidate: unknown): ContentParseResult {
  const result = contentGraphSchema.safeParse(candidate);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, content: result.data };
}
