import { describe, expect, it } from 'vitest';

import { buildRevalidationContentIndex } from './contentIndex';
import { canonicalContent } from '../content';
import type { ContentGraph } from '../content/graph';

describe('buildRevalidationContentIndex', () => {
  it('indexes destination, step, and requirement ids from the canonical content graph', () => {
    const index = buildRevalidationContentIndex(canonicalContent);

    for (const destination of canonicalContent.destinations) {
      expect(index.destinationIds.has(destination.id)).toBe(true);
    }
    for (const step of canonicalContent.steps) {
      expect(index.stepFingerprints.has(step.id)).toBe(true);
    }
    for (const requirement of canonicalContent.requirements) {
      expect(index.requirementFingerprints.has(requirement.id)).toBe(true);
    }
  });

  it('does not include ids that are not in the canonical content graph', () => {
    const index = buildRevalidationContentIndex(canonicalContent);
    expect(index.stepFingerprints.has('definitely-not-a-real-step-id')).toBe(false);
  });

  it('changes a same-id fingerprint when canonical Step semantics change', () => {
    const changed = structuredClone(canonicalContent) as ContentGraph;
    const target = changed.steps[0];
    expect(target).toBeDefined();
    if (target === undefined) return;
    target.description = `${target.description} Semantically revised.`;

    const before = buildRevalidationContentIndex(canonicalContent);
    const after = buildRevalidationContentIndex(changed);
    expect(after.stepFingerprints.get(target.id)).not.toBe(before.stepFingerprints.get(target.id));
  });

  it('changes a same-id fingerprint when canonical Requirement semantics change', () => {
    const changed = structuredClone(canonicalContent) as ContentGraph;
    const target = changed.requirements[0];
    expect(target).toBeDefined();
    if (target === undefined) return;
    target.description = `${target.description} Semantically revised.`;

    const before = buildRevalidationContentIndex(canonicalContent);
    const after = buildRevalidationContentIndex(changed);
    expect(after.requirementFingerprints.get(target.id)).not.toBe(
      before.requirementFingerprints.get(target.id),
    );
  });

  it('changes a Step fingerprint when its containing Route semantics change', () => {
    const changed = structuredClone(canonicalContent) as ContentGraph;
    const route = changed.routes[0];
    const stepId = route?.stepIds[0];
    expect(route).toBeDefined();
    expect(stepId).toBeDefined();
    if (route === undefined || stepId === undefined) return;
    route.priority += 1;

    const before = buildRevalidationContentIndex(canonicalContent);
    const after = buildRevalidationContentIndex(changed);
    expect(after.stepFingerprints.get(stepId)).not.toBe(before.stepFingerprints.get(stepId));
  });

  it('indexes structural reachability from every root Destination', () => {
    const index = buildRevalidationContentIndex(canonicalContent);
    for (const destination of canonicalContent.destinations) {
      expect(index.reachableStepIdsByDestination.has(destination.id)).toBe(true);
      expect(index.reachableRequirementIdsByDestination.has(destination.id)).toBe(true);
    }
  });
});
