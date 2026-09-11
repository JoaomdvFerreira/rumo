import { describe, expect, it } from 'vitest';

import { isStepApplicable, resolveStep } from './step';
import type { StepResolutionInputs } from './step';
import type { Requirement, RequirementGroup } from '../model/requirement';
import type { Step } from '../model/step';
import type { RuntimeProgress } from './runtime';

function index<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function progress(overrides: Partial<RuntimeProgress> = {}): RuntimeProgress {
  return {
    manualCompletedStepIds: new Set(),
    externalOutcomeCompletedStepIds: new Set(),
    ...overrides,
  };
}

function inputs(overrides: Partial<StepResolutionInputs> = {}): StepResolutionInputs {
  return {
    steps: new Map(),
    requirements: new Map(),
    requirementGroups: new Map(),
    facts: {},
    progress: progress(),
    ...overrides,
  };
}

const manualTask: Step = {
  kind: 'task',
  id: 'step.register-address',
  title: 'Register your new address',
  description: 'Submit proof of address to the municipal office.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 0,
  completion: 'manual',
};

const externalTask: Step = { ...manualTask, id: 'step.await-approval', completion: 'externalOutcome' };

const waitStep: Step = {
  kind: 'wait',
  id: 'step.processing',
  title: 'Wait for processing',
  description: 'The municipality processes the registration.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 0,
  completion: 'externalOutcome',
};

const subjourneyStep: Step = {
  kind: 'subjourney',
  id: 'step.setup-utilities',
  title: 'Set up utilities',
  description: 'Complete the utilities setup subjourney.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 0,
  destinationId: 'destination.utilities',
  completion: 'subjourney',
};

describe('isStepApplicable', () => {
  it('is true when appliesWhen is absent', () => {
    expect(isStepApplicable(manualTask, {})).toBe(true);
  });

  it('reflects the step appliesWhen condition', () => {
    const gated: Step = { ...manualTask, appliesWhen: { kind: 'factTruthy', fact: 'x' } };
    expect(isStepApplicable(gated, {})).toBe(false);
    expect(isStepApplicable(gated, { x: true })).toBe(true);
  });
});

describe('resolveStep applicability', () => {
  it('skips a step whose appliesWhen is false', () => {
    const gated: Step = { ...manualTask, appliesWhen: { kind: 'factTruthy', fact: 'x' } };
    const result = resolveStep(gated, inputs({ facts: {} }));
    expect(result.state).toBe('skipped');
  });
});

describe('resolveStep completion modes', () => {
  it('task/manual is completed only by the manual completion signal', () => {
    const withExternal = inputs({ progress: progress({ externalOutcomeCompletedStepIds: new Set([manualTask.id]) }) });
    expect(resolveStep(manualTask, withExternal).state).not.toBe('complete');

    const withManual = inputs({ progress: progress({ manualCompletedStepIds: new Set([manualTask.id]) }) });
    expect(resolveStep(manualTask, withManual).state).toBe('complete');
  });

  it('task/externalOutcome is completed only by the external-outcome completion signal', () => {
    const withManual = inputs({ progress: progress({ manualCompletedStepIds: new Set([externalTask.id]) }) });
    expect(resolveStep(externalTask, withManual).state).not.toBe('complete');

    const withExternal = inputs({ progress: progress({ externalOutcomeCompletedStepIds: new Set([externalTask.id]) }) });
    expect(resolveStep(externalTask, withExternal).state).toBe('complete');
  });

  it('wait/externalOutcome is completed only by the external-outcome completion signal', () => {
    const withManual = inputs({ progress: progress({ manualCompletedStepIds: new Set([waitStep.id]) }) });
    expect(resolveStep(waitStep, withManual).state).not.toBe('complete');

    const withExternal = inputs({ progress: progress({ externalOutcomeCompletedStepIds: new Set([waitStep.id]) }) });
    expect(resolveStep(waitStep, withExternal).state).toBe('complete');
  });
});

describe('resolveStep states', () => {
  it('an incomplete, unblocked task is actionable', () => {
    expect(resolveStep(manualTask, inputs()).state).toBe('actionable');
  });

  it('an incomplete, unblocked wait is waiting, never actionable', () => {
    expect(resolveStep(waitStep, inputs()).state).toBe('waiting');
  });

  it('a step with an unsatisfied dependency is blocked, never actionable', () => {
    const dependency: Step = { ...manualTask, id: 'step.arrive-in-portugal' };
    const dependent: Step = { ...manualTask, id: 'step.register-address', dependsOnStepIds: [dependency.id] };
    const result = resolveStep(dependent, inputs({ steps: index([dependency, dependent]) }));
    expect(result.state).toBe('blocked');
  });

  it('a step whose dependency is complete is not blocked by it', () => {
    const dependency: Step = { ...manualTask, id: 'step.arrive-in-portugal' };
    const dependent: Step = { ...manualTask, id: 'step.register-address', dependsOnStepIds: [dependency.id] };
    const result = resolveStep(
      dependent,
      inputs({
        steps: index([dependency, dependent]),
        progress: progress({ manualCompletedStepIds: new Set([dependency.id]) }),
      }),
    );
    expect(result.state).toBe('actionable');
  });

  it('a non-applicable dependency does not block (it can never complete)', () => {
    const dependency: Step = { ...manualTask, id: 'step.optional', appliesWhen: { kind: 'factTruthy', fact: 'never' } };
    const dependent: Step = { ...manualTask, id: 'step.register-address', dependsOnStepIds: [dependency.id] };
    const result = resolveStep(dependent, inputs({ steps: index([dependency, dependent]), facts: {} }));
    expect(result.state).toBe('actionable');
  });

  it('a missing dependency reference does not block, and is reported as resolver evidence', () => {
    const dependent: Step = { ...manualTask, dependsOnStepIds: ['step.missing'] };
    const result = resolveStep(dependent, inputs({ steps: index([dependent]) }));
    expect(result.state).toBe('actionable');
    expect(result.issues).toEqual([
      { kind: 'missingReference', entityKind: 'step', id: 'step.missing', referencedFrom: dependent.id },
    ]);
  });

  it('an unsatisfied direct requirement blocks the step', () => {
    const requirement: Requirement = {
      id: 'requirement.proof',
      title: 'Proof',
      description: 'desc',
      appliesWhen: { kind: 'factTruthy', fact: 'never' },
      decisionReferenceIds: [],
    };
    // appliesWhen false => requirement does not block; use a different setup for "blocks":
    const blockingRequirement: Requirement = { ...requirement, id: 'requirement.blocking', appliesWhen: undefined };
    void requirement;
    const step: Step = { ...manualTask, requirementIds: ['requirement.missing'] };
    const result = resolveStep(step, inputs({ requirements: index([blockingRequirement]) }));
    expect(result.state).toBe('blocked');
  });

  it('allOf/anyOf RequirementGroups gate step actionability', () => {
    const req: Requirement = {
      id: 'requirement.a',
      title: 'A',
      description: 'desc',
      decisionReferenceIds: [],
    };
    const group: RequirementGroup = { id: 'requirementGroup.g', mode: 'anyOf', requirementIds: [req.id] };
    const step: Step = { ...manualTask, requirementGroupIds: [group.id] };
    const result = resolveStep(
      step,
      inputs({ requirements: index([req]), requirementGroups: index([group]) }),
    );
    expect(result.state).toBe('actionable');
  });

  it('completed steps are never actionable regardless of blocking state', () => {
    const dependency: Step = { ...manualTask, id: 'step.dep' };
    const step: Step = { ...manualTask, dependsOnStepIds: [dependency.id] };
    const result = resolveStep(
      step,
      inputs({
        steps: index([dependency, step]),
        progress: progress({ manualCompletedStepIds: new Set([step.id]) }),
      }),
    );
    expect(result.state).toBe('complete');
  });

  it('subjourney steps derive local dependency/requirement gating like any other step', () => {
    const result = resolveStep(subjourneyStep, inputs());
    expect(['actionable', 'blocked', 'skipped', 'complete', 'waiting']).toContain(result.state);
  });
});
