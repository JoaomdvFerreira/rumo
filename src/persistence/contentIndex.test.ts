import { describe, expect, it } from 'vitest';

import { buildRevalidationContentIndex } from './contentIndex';
import { canonicalContent } from '../content';

describe('buildRevalidationContentIndex', () => {
  it('indexes destination, step, and requirement ids from the canonical content graph', () => {
    const index = buildRevalidationContentIndex(canonicalContent);

    for (const destination of canonicalContent.destinations) {
      expect(index.destinationIds.has(destination.id)).toBe(true);
    }
    for (const step of canonicalContent.steps) {
      expect(index.stepIds.has(step.id)).toBe(true);
    }
    for (const requirement of canonicalContent.requirements) {
      expect(index.requirementIds.has(requirement.id)).toBe(true);
    }
  });

  it('does not include ids that are not in the canonical content graph', () => {
    const index = buildRevalidationContentIndex(canonicalContent);
    expect(index.stepIds.has('definitely-not-a-real-step-id')).toBe(false);
  });
});
