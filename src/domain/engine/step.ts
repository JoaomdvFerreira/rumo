import { isApplicable } from './condition';
import { resolveRequirements } from './requirement';
import type { EntityIndex, ResolverIssue } from './resolver';
import { cycleDetected, missingReference } from './resolver';
import type { RuntimeProgress } from './runtime';
import type { Requirement, RequirementGroup } from '../model/requirement';
import type { Step } from '../model/step';
import type { FactSet } from '../model/fact';

/**
 * Explicit derived Step states. `wait` steps can only ever be `skipped`,
 * `complete`, `blocked`, or `waiting` -- never `actionable` (a wait is never
 * an executable action). `subjourney` steps resolve their own actionability
 * through the target Destination (see destination.ts); this module derives
 * the full local state for a subjourney step -- including completion, which
 * it obtains from the caller-supplied `resolveSubjourneyCompletion` rather
 * than from any runtime completion set.
 */
export type StepState = 'skipped' | 'complete' | 'blocked' | 'actionable' | 'waiting';

export interface StepResolution {
  readonly step: Step;
  readonly state: StepState;
  readonly issues: readonly ResolverIssue[];
}

/**
 * Resolves whether a subjourney Step's target Destination is complete.
 * Supplied by the destination resolver, which owns the Destination graph
 * and the cycle-safe recursion needed to answer this -- step.ts itself has
 * no visibility into Destinations. Must be a pure function of its input
 * (same destinationId always yields the same answer for a given resolution
 * pass) so overall step resolution stays deterministic.
 */
export type SubjourneyCompletionResolver = (destinationId: string) => boolean;

export interface StepResolutionInputs {
  readonly steps: EntityIndex<Step>;
  readonly requirements: EntityIndex<Requirement>;
  readonly requirementGroups: EntityIndex<RequirementGroup>;
  readonly facts: FactSet;
  readonly progress: RuntimeProgress;
  readonly resolveSubjourneyCompletion: SubjourneyCompletionResolver;
}

/**
 * Whether a step is "applicable" per its own `appliesWhen`. A step with no
 * condition always applies.
 */
export function isStepApplicable(step: Step, facts: FactSet): boolean {
  return isApplicable(step.appliesWhen, facts);
}

function isStepComplete(step: Step, inputs: StepResolutionInputs): boolean {
  switch (step.kind) {
    case 'task':
      return step.completion === 'manual'
        ? inputs.progress.manualCompletedStepIds.has(step.id)
        : inputs.progress.externalOutcomeCompletedStepIds.has(step.id);
    case 'wait':
      return inputs.progress.externalOutcomeCompletedStepIds.has(step.id);
    case 'subjourney':
      // Never derived from manual/externalOutcome completion sets: a
      // subjourney is complete only when its target Destination is.
      return inputs.resolveSubjourneyCompletion(step.destinationId);
  }
}

/**
 * A dependency blocks only when it resolves, is applicable, and is not
 * complete/skipped. A dependency that is itself non-applicable (skipped)
 * must not block -- it can never be completed, so requiring it would make
 * the dependent step permanently unreachable. A missing dependency id is
 * reported as resolver evidence and, deterministically, does not block
 * (there is nothing to satisfy). `visiting` guards against dependency
 * cycles (including direct self-dependency): a step already on the current
 * resolution stack is never recursed into again -- it is instead reported
 * as a cycle and, because a cyclic dependency can never resolve to
 * `complete`, treated as blocking so the affected work stays non-actionable
 * rather than silently passing through.
 */
function dependencyBlocks(
  dependencyId: string,
  inputs: StepResolutionInputs,
  referencedFrom: string,
  visiting: ReadonlySet<string>,
): { blocks: boolean; issues: ResolverIssue[] } {
  const dependency = inputs.steps.get(dependencyId);
  if (dependency === undefined) {
    return { blocks: false, issues: [missingReference('step', dependencyId, referencedFrom)] };
  }
  if (visiting.has(dependencyId)) {
    return { blocks: true, issues: [cycleDetected('step', dependencyId)] };
  }
  if (!isStepApplicable(dependency, inputs.facts)) {
    return { blocks: false, issues: [] };
  }
  const dependencyResolution = resolveStepInternal(dependency, inputs, visiting);
  return { blocks: dependencyResolution.state !== 'complete', issues: [...dependencyResolution.issues] };
}

function resolveStepInternal(step: Step, inputs: StepResolutionInputs, visiting: ReadonlySet<string>): StepResolution {
  const issues: ResolverIssue[] = [];

  if (!isStepApplicable(step, inputs.facts)) {
    return { step, state: 'skipped', issues };
  }

  if (isStepComplete(step, inputs)) {
    return { step, state: 'complete', issues };
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(step.id);

  let blocked = false;
  for (const dependencyId of step.dependsOnStepIds) {
    const result = dependencyBlocks(dependencyId, inputs, step.id, nextVisiting);
    issues.push(...result.issues);
    if (result.blocks) blocked = true;
  }

  const requirementResolution = resolveRequirements(
    step.requirementIds,
    step.requirementGroupIds,
    inputs.requirements,
    inputs.requirementGroups,
    inputs.facts,
    inputs.progress.satisfiedRequirementIds,
    step.id,
  );
  issues.push(...requirementResolution.issues);
  if (!requirementResolution.satisfied) blocked = true;

  if (blocked) {
    return { step, state: 'blocked', issues };
  }

  if (step.kind === 'wait') {
    return { step, state: 'waiting', issues };
  }

  return { step, state: 'actionable', issues };
}

export function resolveStep(step: Step, inputs: StepResolutionInputs): StepResolution {
  return resolveStepInternal(step, inputs, new Set());
}
