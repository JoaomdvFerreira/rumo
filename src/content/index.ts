import { contentGraph } from './data';
import { computeContentHash } from './hash';
import { parseContentGraph } from './parse';
import type { ContentGraph } from './graph';

export * from './graph';
export * from './hash';
export * from './parse';
export * from './validate';

/**
 * The canonical, schema-validated representative content graph. Parsed
 * once at module load so any structural (shape-level) defect fails fast
 * and loudly rather than surfacing later as a confusing runtime error deep
 * in the routing engine.
 */
const parsed = parseContentGraph(contentGraph);
if (!parsed.success) {
  throw new Error(`Canonical content failed schema validation: ${parsed.error.message}`);
}

export const canonicalContent: ContentGraph = parsed.content;

export const contentHash: string = computeContentHash(canonicalContent);
