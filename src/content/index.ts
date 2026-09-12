import { contentGraph } from './data';
import { computeContentHash } from './hash';
import { checkIntentCatalog, intentCatalog } from './intents';
import { parseContentGraph } from './parse';
import type { ContentGraph } from './graph';

export * from './graph';
export * from './hash';
export * from './parse';
export * from './validate';
export * from './intents';

/**
 * The canonical, schema-validated representative content graph. Parsed
 * once at module load so any structural (shape-level) defect fails fast
 * and loudly rather than surfacing later as a confusing runtime error deep
 * in the routing engine.
 */
const parsed = parseContentGraph(contentGraph);
if (!parsed.success) {
  throw new Error(
    `Canonical content failed schema validation: ${parsed.error.message}`,
  );
}

export const canonicalContent: ContentGraph = parsed.content;

const intentIssues = checkIntentCatalog(
  intentCatalog,
  canonicalContent.destinations,
);
if (intentIssues.length > 0) {
  throw new Error(
    `Canonical intent catalog failed validation: ${JSON.stringify(intentIssues)}`,
  );
}

export const contentHash: string = computeContentHash(canonicalContent);
