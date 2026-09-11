import { isApplicable } from './condition';
import type { EntityIndex, ResolverIssue } from './resolver';
import { missingReference } from './resolver';
import type { FactSet } from '../model/fact';
import type { Requirement, RequirementGroup } from '../model/requirement';

/**
 * Deterministic requirement/group satisfaction:
 * - a Requirement whose own `appliesWhen` is false is not applicable and
 *   never blocks;
 * - an applicable direct Requirement is currently always "satisfied" by
 *   content alone (WU003 defines no separate requirement-fulfilment signal
 *   beyond applicability -- fulfilment tracking, if any, is a later concern);
 *   what matters here is that a *missing* requirement reference must not
 *   silently pass;
 * - RequirementGroup `allOf` requires every applicable member to resolve
 *   and be satisfied; `anyOf` requires at least one; a group with zero
 *   applicable members after conditional filtering does not block.
 */
export interface RequirementResolution {
  readonly satisfied: boolean;
  readonly issues: readonly ResolverIssue[];
}

function resolveRequirementRef(
  id: string,
  requirements: EntityIndex<Requirement>,
  facts: FactSet,
  referencedFrom: string | undefined,
): { applicable: boolean; satisfied: boolean; issue?: ResolverIssue } {
  const requirement = requirements.get(id);
  if (requirement === undefined) {
    return { applicable: true, satisfied: false, issue: missingReference('requirement', id, referencedFrom) };
  }
  const applicable = isApplicable(requirement.appliesWhen, facts);
  // A resolved requirement is always "satisfied" in WU003's model (there is
  // no separate fulfilment signal beyond applicability) whether or not it
  // applies: an applicable requirement is met by content, and a
  // non-applicable one must not block. `applicable` is still reported so
  // group aggregation (allOf/anyOf) can exclude non-applicable members from
  // its member count.
  return { applicable, satisfied: true };
}

export function resolveRequirement(
  id: string,
  requirements: EntityIndex<Requirement>,
  facts: FactSet,
  referencedFrom?: string,
): RequirementResolution {
  const { satisfied, issue } = resolveRequirementRef(id, requirements, facts, referencedFrom);
  return { satisfied, issues: issue ? [issue] : [] };
}

export function resolveRequirementGroup(
  id: string,
  groups: EntityIndex<RequirementGroup>,
  requirements: EntityIndex<Requirement>,
  facts: FactSet,
  referencedFrom?: string,
): RequirementResolution {
  const group = groups.get(id);
  if (group === undefined) {
    return { satisfied: false, issues: [missingReference('requirementGroup', id, referencedFrom)] };
  }

  const issues: ResolverIssue[] = [];
  const applicableResults: boolean[] = [];

  for (const requirementId of group.requirementIds) {
    const result = resolveRequirementRef(requirementId, requirements, facts, group.id);
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
  referencedFrom?: string,
): RequirementResolution {
  const issues: ResolverIssue[] = [];
  let satisfied = true;

  for (const id of requirementIds) {
    const result = resolveRequirement(id, requirements, facts, referencedFrom);
    issues.push(...result.issues);
    if (!result.satisfied) satisfied = false;
  }

  for (const id of requirementGroupIds) {
    const result = resolveRequirementGroup(id, groups, requirements, facts, referencedFrom);
    issues.push(...result.issues);
    if (!result.satisfied) satisfied = false;
  }

  return { satisfied, issues };
}
