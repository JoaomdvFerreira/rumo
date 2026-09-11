import { describe, expect, it } from 'vitest';

import { resolveRequirement, resolveRequirementGroup, resolveRequirements } from './requirement';
import type { Requirement, RequirementGroup } from '../model/requirement';

function index<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

const NONE: ReadonlySet<string> = new Set();

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
  it('is unsatisfied when applicable and its id is absent from satisfiedRequirementIds', () => {
    const requirements = index([proofOfAddress]);
    const result = resolveRequirement(proofOfAddress.id, requirements, {}, NONE);
    expect(result.satisfied).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it('is satisfied only once its id is present in satisfiedRequirementIds', () => {
    const requirements = index([proofOfAddress]);
    const satisfied = new Set([proofOfAddress.id]);
    const result = resolveRequirement(proofOfAddress.id, requirements, {}, satisfied);
    expect(result.satisfied).toBe(true);
  });

  it('does not block when the requirement own appliesWhen is false, regardless of satisfiedRequirementIds', () => {
    const requirements = index([onlyIfForeign]);
    const result = resolveRequirement(onlyIfForeign.id, requirements, { 'household.isForeign': false }, NONE);
    expect(result.satisfied).toBe(true);
  });

  it('requires the runtime signal when appliesWhen is true', () => {
    const requirements = index([onlyIfForeign]);
    const facts = { 'household.isForeign': true };
    const unsatisfied = resolveRequirement(onlyIfForeign.id, requirements, facts, NONE);
    expect(unsatisfied.satisfied).toBe(false);

    const satisfied = resolveRequirement(onlyIfForeign.id, requirements, facts, new Set([onlyIfForeign.id]));
    expect(satisfied.satisfied).toBe(true);
  });

  it('produces deterministic resolver evidence for a missing requirement reference', () => {
    const result = resolveRequirement('requirement.missing', new Map(), {}, NONE, 'step.example');
    expect(result.satisfied).toBe(false);
    expect(result.issues).toEqual([
      { kind: 'missingReference', entityKind: 'requirement', id: 'requirement.missing', referencedFrom: 'step.example' },
    ]);
  });
});

describe('resolveRequirementGroup', () => {
  const requirements = index([proofOfAddress, onlyIfForeign]);

  it('allOf requires every applicable member to be satisfied by the runtime signal', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'allOf',
      requirementIds: [proofOfAddress.id, onlyIfForeign.id],
    };
    const groups = index([group]);
    const facts = { 'household.isForeign': true };

    const missingBoth = resolveRequirementGroup(group.id, groups, requirements, facts, NONE);
    expect(missingBoth.satisfied).toBe(false);

    const onlyOneSatisfied = resolveRequirementGroup(group.id, groups, requirements, facts, new Set([proofOfAddress.id]));
    expect(onlyOneSatisfied.satisfied).toBe(false);

    const bothSatisfied = resolveRequirementGroup(
      group.id,
      groups,
      requirements,
      facts,
      new Set([proofOfAddress.id, onlyIfForeign.id]),
    );
    expect(bothSatisfied.satisfied).toBe(true);
  });

  it('a non-applicable member is excluded from allOf and does not block', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'allOf',
      requirementIds: [proofOfAddress.id, onlyIfForeign.id],
    };
    const groups = index([group]);
    const result = resolveRequirementGroup(
      group.id,
      groups,
      requirements,
      { 'household.isForeign': false },
      new Set([proofOfAddress.id]),
    );
    expect(result.satisfied).toBe(true);
  });

  it('anyOf requires at least one applicable member satisfied by the runtime signal', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.identity',
      mode: 'anyOf',
      requirementIds: [proofOfAddress.id],
    };
    const groups = index([group]);

    const unsatisfied = resolveRequirementGroup(group.id, groups, requirements, {}, NONE);
    expect(unsatisfied.satisfied).toBe(false);

    const satisfied = resolveRequirementGroup(group.id, groups, requirements, {}, new Set([proofOfAddress.id]));
    expect(satisfied.satisfied).toBe(true);
  });

  it('a group with zero applicable members after filtering does not block', () => {
    const group: RequirementGroup = {
      id: 'requirementGroup.foreign-only',
      mode: 'allOf',
      requirementIds: [onlyIfForeign.id],
    };
    const groups = index([group]);
    const result = resolveRequirementGroup(group.id, groups, requirements, { 'household.isForeign': false }, NONE);
    expect(result.satisfied).toBe(true);
  });

  it('produces deterministic resolver evidence for a missing group reference', () => {
    const result = resolveRequirementGroup('requirementGroup.missing', new Map(), requirements, {}, NONE, 'step.example');
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
    const result = resolveRequirementGroup(group.id, groups, requirements, {}, NONE);
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

  it('is satisfied only once every direct requirement and group is satisfied by the runtime signal', () => {
    const unsatisfied = resolveRequirements([proofOfAddress.id], [group.id], requirements, groups, {}, NONE);
    expect(unsatisfied.satisfied).toBe(false);

    const satisfied = resolveRequirements(
      [proofOfAddress.id],
      [group.id],
      requirements,
      groups,
      {},
      new Set([proofOfAddress.id]),
    );
    expect(satisfied.satisfied).toBe(true);
  });

  it('is not satisfied when any direct requirement is missing', () => {
    const result = resolveRequirements(['requirement.missing'], [], requirements, groups, {}, NONE);
    expect(result.satisfied).toBe(false);
  });
});
