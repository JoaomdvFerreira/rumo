import { isApplicable } from './condition';
import type { EntityIndex, ResolverIssue } from './resolver';
import { missingReference } from './resolver';
import type { FactSet } from '../model/fact';
import type { Requirement, RequirementGroup } from '../model/requirement';

/**
 * Deterministic requirement/group satisfaction:
 * - a Requirement whose own `appliesWhen` is false is not applicable and
 *   never blocks;
 * - an applicable direct Requirement is satisfied only when its id is a
 *   member of the runtime `satisfiedRequirementIds` signal -- there is no
 *   other fulfilment source;
 * - a missing Requirement reference is unsatisfied and reported as
 *   resolver evidence, never silently passed;
 * - RequirementGroup `allOf` requires every applicable member to be
 *   satisfied; `anyOf` requires at least one; a group with zero applicable
 *   members after conditional filtering does not block.
 */
export interface RequirementResolution {
  readonly satisfied: boolean;
  readonly issues: readonly ResolverIssue[];
}

function resolveRequirementRef(
  id: string,
  requirements: EntityIndex<Requirement>,
  facts: FactSet,
  satisfiedRequirementIds: ReadonlySet<string>,
  referencedFrom: string | undefined,
): { applicable: boolean; satisfied: boolean; issue?: ResolverIssue } {
  const requirement = requirements.get(id);
  if (requirement === undefined) {
    return { applicable: true, satisfied: false, issue: missingReference('requirement', id, referencedFrom) };
  }
  const applicable = isApplicable(requirement.appliesWhen, facts);
  // A non-applicable requirement never blocks (reported satisfied from the
  // caller's perspective); an applicable one is satisfied only by the
  // runtime signal.
  const satisfied = applicable ? satisfiedRequirementIds.has(id) : true;
  return { applicable, satisfied };
}

export function resolveRequirement(
  id: string,
  requirements: EntityIndex<Requirement>,
  facts: FactSet,
  satisfiedRequirementIds: ReadonlySet<string>,
  referencedFrom?: string,
): RequirementResolution {
  const { satisfied, issue } = resolveRequirementRef(id, requirements, facts, satisfiedRequirementIds, referencedFrom);
  return { satisfied, issues: issue ? [issue] : [] };
}

export function resolveRequirementGroup(
  id: string,
  groups: EntityIndex<RequirementGroup>,
  requirements: EntityIndex<Requirement>,
  facts: FactSet,
  satisfiedRequirementIds: ReadonlySet<string>,
  referencedFrom?: string,
): RequirementResolution {
  const group = groups.get(id);
  if (group === undefined) {
    return { satisfied: false, issues: [missingReference('requirementGroup', id, referencedFrom)] };
  }

  const issues: ResolverIssue[] = [];
  const applicableResults: boolean[] = [];

  for (const requirementId of group.requirementIds) {
    const result = resolveRequirementRef(requirementId, requirements, facts, satisfiedRequirementIds, group.id);
    if (result.issue) issues.push(result.issue);
    if (result.applicable) applicableResults.push(result.satisfied);
  }

  if (applicableResults.length === 0) {
    return { satisfied: true, issues };
  }

  const satisfied =
    group.mode === 'allOf' ? applicableResults.every(Boolean) : applicableResults.some(Boolean);

  return { satisfied, issues };
}

/**
 * Aggregate resolution across a Step's direct requirementIds and
 * requirementGroupIds: every referenced item must resolve as satisfied for
 * the aggregate to be satisfied. Issues from all references are collected
 * rather than short-circuited, so callers get complete resolver evidence.
 */
export function resolveRequirements(
  requirementIds: readonly string[],
  requirementGroupIds: readonly string[],
  requirements: EntityIndex<Requirement>,
  groups: EntityIndex<RequirementGroup>,
  facts: FactSet,
  satisfiedRequirementIds: ReadonlySet<string>,
  referencedFrom?: string,
): RequirementResolution {
  const issues: ResolverIssue[] = [];
  let satisfied = true;

  for (const id of requirementIds) {
    const result = resolveRequirement(id, requirements, facts, satisfiedRequirementIds, referencedFrom);
    issues.push(...result.issues);
    if (!result.satisfied) satisfied = false;
  }

  for (const id of requirementGroupIds) {
    const result = resolveRequirementGroup(id, groups, requirements, facts, satisfiedRequirementIds, referencedFrom);
    issues.push(...result.issues);
    if (!result.satisfied) satisfied = false;
  }

  return { satisfied, issues };
}
