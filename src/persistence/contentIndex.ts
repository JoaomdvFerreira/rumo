import type { RevalidationContentIndex } from './revalidate';
import type { ContentGraph } from '../content/graph';

/**
 * Builds the id-existence surface revalidation needs from the canonical
 * `ContentGraph` (WU002/WU004). Kept as a thin adapter so `revalidate.ts`
 * itself never imports `src/content`, and can be tested against synthetic
 * id sets without constructing real content.
 */
export function buildRevalidationContentIndex(content: ContentGraph): RevalidationContentIndex {
  return {
    destinationIds: new Set(content.destinations.map((destination) => destination.id)),
    stepIds: new Set(content.steps.map((step) => step.id)),
    requirementIds: new Set(content.requirements.map((requirement) => requirement.id)),
  };
}
