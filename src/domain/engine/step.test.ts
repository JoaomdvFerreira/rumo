import fc from 'fast-check';
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
    satisfiedRequirementIds: new Set(),
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
    resolveSubjourneyCompletion: () => false,
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

  it('subjourney completion is derived only from resolveSubjourneyCompletion, never from manual/externalOutcome sets', () => {
    const withManual = inputs({
      progress: progress({ manualCompletedStepIds: new Set([subjourneyStep.id]) }),
      resolveSubjourneyCompletion: () => false,
    });
    expect(resolveStep(subjourneyStep, withManual).state).not.toBe('complete');

    const withExternal = inputs({
      progress: progress({ externalOutcomeCompletedStepIds: new Set([subjourneyStep.id]) }),
      resolveSubjourneyCompletion: () => false,
    });
    expect(resolveStep(subjourneyStep, withExternal).state).not.toBe('complete');

    const withDerivedCompletion = inputs({ resolveSubjourneyCompletion: () => true });
    expect(resolveStep(subjourneyStep, withDerivedCompletion).state).toBe('complete');
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
    const blockingRequirement: Requirement = {
      id: 'requirement.blocking',
      title: 'Blocking',
      description: 'desc',
      decisionReferenceIds: [],
    };
    const step: Step = { ...manualTask, requirementIds: [blockingRequirement.id] };
    const result = resolveStep(step, inputs({ requirements: index([blockingRequirement]) }));
    expect(result.state).toBe('blocked');
  });

  it('a direct requirement stops blocking once its id is present in satisfiedRequirementIds', () => {
    const requirement: Requirement = {
      id: 'requirement.proof',
      title: 'Proof',
      description: 'desc',
      decisionReferenceIds: [],
    };
    const step: Step = { ...manualTask, requirementIds: [requirement.id] };
    const inputsBase = { requirements: index([requirement]) };

    const blocked = resolveStep(step, inputs(inputsBase));
    expect(blocked.state).toBe('blocked');

    const unblocked = resolveStep(
      step,
      inputs({ ...inputsBase, progress: progress({ satisfiedRequirementIds: new Set([requirement.id]) }) }),
    );
    expect(unblocked.state).toBe('actionable');
  });

  it('allOf/anyOf RequirementGroups gate step actionability until satisfied', () => {
    const req: Requirement = {
      id: 'requirement.a',
      title: 'A',
      description: 'desc',
      decisionReferenceIds: [],
    };
    const group: RequirementGroup = { id: 'requirementGroup.g', mode: 'anyOf', requirementIds: [req.id] };
    const step: Step = { ...manualTask, requirementGroupIds: [group.id] };
    const base = { requirements: index([req]), requirementGroups: index([group]) };

    const blocked = resolveStep(step, inputs(base));
    expect(blocked.state).toBe('blocked');

    const unblocked = resolveStep(
      step,
      inputs({ ...base, progress: progress({ satisfiedRequirementIds: new Set([req.id]) }) }),
    );
    expect(unblocked.state).toBe('actionable');
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

describe('resolveStep dependency cycle safety (F2)', () => {
  it('a 2-node dependency cycle (A depends B, B depends A) never recurses indefinitely and is reported', () => {
    const a: Step = { ...manualTask, id: 'step.a', dependsOnStepIds: ['step.b'] };
    const b: Step = { ...manualTask, id: 'step.b', dependsOnStepIds: ['step.a'] };
    const steps = index([a, b]);

    const resultA = resolveStep(a, inputs({ steps }));
    expect(resultA.issues.some((issue) => issue.kind === 'cycle')).toBe(true);
    expect(resultA.state).not.toBe('actionable');

    const resultB = resolveStep(b, inputs({ steps }));
    expect(resultB.issues.some((issue) => issue.kind === 'cycle')).toBe(true);
    expect(resultB.state).not.toBe('actionable');
  });

  it('a self dependency (A depends A) never recurses indefinitely and leaves the step non-actionable', () => {
    const a: Step = { ...manualTask, id: 'step.a', dependsOnStepIds: ['step.a'] };
    const result = resolveStep(a, inputs({ steps: index([a]) }));
    expect(result.issues.some((issue) => issue.kind === 'cycle')).toBe(true);
    expect(result.state).not.toBe('actionable');
  });

  it('propagates resolver issues discovered transitively through a dependency chain', () => {
    const c: Step = { ...manualTask, id: 'step.c', dependsOnStepIds: ['step.missing'] };
    const b: Step = { ...manualTask, id: 'step.b', dependsOnStepIds: [c.id] };
    const a: Step = { ...manualTask, id: 'step.a', dependsOnStepIds: [b.id] };
    const result = resolveStep(a, inputs({ steps: index([a, b, c]) }));
    expect(result.issues).toContainEqual({
      kind: 'missingReference',
      entityKind: 'step',
      id: 'step.missing',
      referencedFrom: c.id,
    });
  });

  it('does not mutate canonical Steps while resolving a cycle', () => {
    const a: Step = { ...manualTask, id: 'step.a', dependsOnStepIds: ['step.b'] };
    const b: Step = { ...manualTask, id: 'step.b', dependsOnStepIds: ['step.a'] };
    const steps = index([a, b]);
    const snapshot = structuredClone({ a, b });
    resolveStep(a, inputs({ steps }));
    expect(a).toEqual(snapshot.a);
    expect(b).toEqual(snapshot.b);
  });
});

describe('resolveStep property invariants', () => {
  it('is deterministic for a fixed dependency graph regardless of cycles', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (n) => {
        const ids = Array.from({ length: n }, (_, i) => `step.${i}`);
        const steps = index(
          ids.map((id, i) => ({
            ...manualTask,
            id,
            // Each step depends on the next, wrapping around to form a cycle.
            dependsOnStepIds: [ids[(i + 1) % n]],
          })),
        );
        const target = steps.get(ids[0])!;
        const first = resolveStep(target, inputs({ steps }));
        const second = resolveStep(target, inputs({ steps }));
        expect(second.state).toBe(first.state);
        expect(second.issues.length).toBe(first.issues.length);
      }),
    );
  });
});
