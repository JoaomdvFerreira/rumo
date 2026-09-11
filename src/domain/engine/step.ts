import { isApplicable } from './condition';
import { resolveRequirements } from './requirement';
import type { EntityIndex, ResolverIssue } from './resolver';
import { missingReference } from './resolver';
import { isStepCompleted } from './runtime';
import type { RuntimeProgress } from './runtime';
import type { Requirement, RequirementGroup } from '../model/requirement';
import type { Step } from '../model/step';
import type { FactSet } from '../model/fact';

/**
 * Explicit derived Step states. `wait` steps can only ever be `skipped`,
 * `complete`, `blocked`, or `waiting` -- never `actionable` (a wait is never
 * an executable action). `subjourney` steps resolve their own actionability
 * through the target Destination (see destination.ts); this module derives
 * only the local (non-recursive) state for a subjourney step -- whether it
 * is skipped/complete/blocked/pending -- and leaves "does the subjourney
 * contain actionable work" to the destination resolver.
 */
export type StepState = 'skipped' | 'complete' | 'blocked' | 'actionable' | 'waiting';

export interface StepResolution {
  readonly step: Step;
  readonly state: StepState;
  readonly issues: readonly ResolverIssue[];
}

export interface StepResolutionInputs {
  readonly steps: EntityIndex<Step>;
  readonly requirements: EntityIndex<Requirement>;
  readonly requirementGroups: EntityIndex<RequirementGroup>;
  readonly facts: FactSet;
  readonly progress: RuntimeProgress;
}

/**
 * Whether a step is "applicable" per its own `appliesWhen`. A step with no
 * condition always applies.
 */
export function isStepApplicable(step: Step, facts: FactSet): boolean {
  return isApplicable(step.appliesWhen, facts);
}

/**
 * A dependency blocks only when it resolves, is applicable, and is not
 * complete/skipped. A dependency that is itself non-applicable (skipped)
 * must not block -- it can never be completed, so requiring it would make
 * the dependent step permanently unreachable. A missing dependency id is
 * reported as resolver evidence and, deterministically, does not block
 * (there is nothing to satisfy).
 */
function dependencyBlocks(dependencyId: string, inputs: StepResolutionInputs, referencedFrom: string): {
  blocks: boolean;
  issue?: ResolverIssue;
} {
  const dependency = inputs.steps.get(dependencyId);
  if (dependency === undefined) {
    return { blocks: false, issue: missingReference('step', dependencyId, referencedFrom) };
  }
  if (!isStepApplicable(dependency, inputs.facts)) {
    return { blocks: false };
  }
  const dependencyState = resolveStepState(dependency, inputs).state;
  return { blocks: dependencyState !== 'complete' };
}

function resolveStepState(step: Step, inputs: StepResolutionInputs): StepResolution {
  const issues: ResolverIssue[] = [];

  if (!isStepApplicable(step, inputs.facts)) {
    return { step, state: 'skipped', issues };
  }

  const completed =
    step.kind === 'task'
      ? step.completion === 'manual'
        ? inputs.progress.manualCompletedStepIds.has(step.id)
        : inputs.progress.externalOutcomeCompletedStepIds.has(step.id)
      : step.kind === 'wait'
        ? inputs.progress.externalOutcomeCompletedStepIds.has(step.id)
        : /* subjourney: completion is derived from the target Destination by the
             caller (destination.ts), which has the Destination graph this
             module does not. Local state here reflects only dependency/
             requirement gating; the destination resolver overrides this with
             the subjourney's actual completion when it recurses. */
          isStepCompleted(inputs.progress, step.id);

  if (completed) {
    return { step, state: 'complete', issues };
  }

  let blocked = false;
  for (const dependencyId of step.dependsOnStepIds) {
    const result = dependencyBlocks(dependencyId, inputs, step.id);
    if (result.issue) issues.push(result.issue);
    if (result.blocks) blocked = true;
  }

  const requirementResolution = resolveRequirements(
    step.requirementIds,
    step.requirementGroupIds,
    inputs.requirements,
    inputs.requirementGroups,
    inputs.facts,
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
  return resolveStepState(step, inputs);
}
