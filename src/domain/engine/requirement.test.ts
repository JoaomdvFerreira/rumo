import { describe, expect, it } from 'vitest';

import { resolveRequirement, resolveRequirementGroup, resolveRequirements } from './requirement';
import type { Requirement, RequirementGroup } from '../model/requirement';

function index<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

const proofOfAddress: Requirement = {
  id: 'requirement.proof-of-address',
  title: 'Proof of address',
  description: 'A recent utility bill or rental contract.',
  decisionReferenceIds: [],
};

const onlyIfForeign: Requirement = {
  id: 'requirement.translated-documents',
  title: 'Translated documents',
  description: 'Certified translation of foreign civil documents.',
  appliesWhen: { kind: 'factTruthy', fact: 'household.isForeign' },
  decisionReferenceIds: [],
};

describe('resolveRequirement', () => {
  it('is satisfied when the requirement is applicable', () => {
    const requirements = index([proofOfAddress]);
    const result = resolveRequirement(proofOfAddress.id, requirements, {});
    expect(result.satisfied).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('does not block when the requirement own appliesWhen is false', () => {
    const requirements = index([onlyIfForeign]);
    const result = resolveRequirement(onlyIfForeign.id, requirements, { 'household.isForeign': false });
    expect(result.satisfied).toBe(true);
  });

  it('is satisfied when appliesWhen is true and requirement is present', () => {
    const requirements = index([onlyIfForeign]);
    const result = resolveRequirement(onlyIfForeign.id, requirements, { 'household.isForeign': true });
    expect(result.satisfied).toBe(true);
  });

  it('produces deterministic resolver evidence for a missing requirement reference', () => {
    const result = resolveRequirement('requirement.missing', new Map(), {}, 'step.example');
    expect(result.satisfied).toBe(false);
    expect(result.issues).toEqual([
      { kind: 'missingReference', entityKind: 'requirement', id: 'requirement.missing', referencedFrom: 'step.example' },
    ]);
  });
});

describe('resolveRequirementGroup', () => {
  const requirements = index([proofOfAddress, onlyIfForeign]);

  it('allOf requires every applicable member to be satisfied', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'allOf',
      requirementIds: [proofOfAddress.id, onlyIfForeign.id],
    };
    const groups = index([group]);
    const resultForeign = resolveRequirementGroup(group.id, groups, requirements, { 'household.isForeign': true });
    expect(resultForeign.satisfied).toBe(true);
  });

  it('a non-applicable member is excluded from allOf and does not block', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'allOf',
      requirementIds: [proofOfAddress.id, onlyIfForeign.id],
    };
    const groups = index([group]);
    const result = resolveRequirementGroup(group.id, groups, requirements, { 'household.isForeign': false });
    expect(result.satisfied).toBe(true);
  });

  it('anyOf requires at least one applicable member to be satisfied', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'anyOf',
      requirementIds: [proofOfAddress.id],
    };
    const groups = index([group]);
    const result = resolveRequirementGroup(group.id, groups, requirements, {});
    expect(result.satisfied).toBe(true);
  });

  it('a group with zero applicable members after filtering does not block', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.foreign-only',
      mode: 'allOf',
      requirementIds: [onlyIfForeign.id],
    };
    const groups = index([group]);
    const result = resolveRequirementGroup(group.id, groups, requirements, { 'household.isForeign': false });
    expect(result.satisfied).toBe(true);
  });

  it('produces deterministic resolver evidence for a missing group reference', () => {
    const result = resolveRequirementGroup('requirementGroup.missing', new Map(), requirements, {}, 'step.example');
    expect(result.satisfied).toBe(false);
    expect(result.issues).toEqual([
      {
        kind: 'missingReference',
        entityKind: 'requirementGroup',
        id: 'requirementGroup.missing',
        referencedFrom: 'step.example',
      },
    ]);
  });

  it('collects evidence for a missing member requirement without silently passing', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'allOf',
      requirementIds: ['requirement.missing'],
    };
    const groups = index([group]);
    const result = resolveRequirementGroup(group.id, groups, requirements, {});
    expect(result.satisfied).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].kind).toBe('missingReference');
  });
});

describe('resolveRequirements aggregate', () => {
  const requirements = index([proofOfAddress, onlyIfForeign]);
  const group: RequirementGroup = {
    id: 'requirementGroup.identity',
    mode: 'anyOf',
    requirementIds: [proofOfAddress.id],
  };
  const groups = index([group]);

  it('is satisfied when every direct requirement and group is satisfied', () => {
    const result = resolveRequirements([proofOfAddress.id], [group.id], requirements, groups, {});
    expect(result.satisfied).toBe(true);
  });

  it('is not satisfied when any direct requirement is missing', () => {
    const result = resolveRequirements(['requirement.missing'], [], requirements, groups, {});
    expect(result.satisfied).toBe(false);
  });
});
