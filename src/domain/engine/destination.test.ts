import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { resolveDestination } from './destination';
import type { DestinationGraph } from './destination';
import type { RoutingContext, RuntimeProgress } from './runtime';
import type { Destination, Route } from '../model/routing';
import type { Step } from '../model/step';

function index<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function graph(overrides: Partial<DestinationGraph> = {}): DestinationGraph {
  return {
    destinations: new Map(),
    routes: new Map(),
    routeVariants: new Map(),
    steps: new Map(),
    requirements: new Map(),
    requirementGroups: new Map(),
    ...overrides,
  };
}

function progress(overrides: Partial<RuntimeProgress> = {}): RuntimeProgress {
  return {
    manualCompletedStepIds: new Set(),
    externalOutcomeCompletedStepIds: new Set(),
    satisfiedRequirementIds: new Set(),
    ...overrides,
  };
}

function context(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return { facts: {}, progress: progress(), ...overrides };
}

function task(id: string, extra: Partial<Step> = {}): Step {
  return {
    kind: 'task',
    id,
    title: id,
    description: id,
    requirementIds: [],
    requirementGroupIds: [],
    dependsOnStepIds: [],
    priority: 0,
    completion: 'manual',
    ...extra,
  } as Step;
}

function wait(id: string, extra: Partial<Step> = {}): Step {
  return {
    kind: 'wait',
    id,
    title: id,
    description: id,
    requirementIds: [],
    requirementGroupIds: [],
    dependsOnStepIds: [],
    priority: 0,
    completion: 'externalOutcome',
    ...extra,
  } as Step;
}

function subjourney(id: string, destinationId: string, extra: Partial<Step> = {}): Step {
  return {
    kind: 'subjourney',
    id,
    title: id,
    description: id,
    requirementIds: [],
    requirementGroupIds: [],
    dependsOnStepIds: [],
    priority: 0,
    destinationId,
    completion: 'subjourney',
    ...extra,
  } as Step;
}

function destination(id: string, routeIds: string[]): Destination {
  return { id, title: id, description: id, routeIds };
}

function route(id: string, stepIds: string[], extra: Partial<Route> = {}): Route {
  return { id, title: id, priority: 0, stepIds, variantIds: [], ...extra };
}

describe('resolveDestination: next action / parallel / waits', () => {
  it('selects the highest-priority actionable task as the primary action, never a wait', () => {
    const low = task('step.low', { priority: 1 });
    const high = task('step.high', { priority: 5 });
    const w = wait('step.wait');
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [w.id, low.id, high.id]);
    const g = graph({
      destinations: index([dest]),
      routes: index([r]),
      steps: index([low, high, w]),
    });

    const result = resolveDestination(dest.id, g, context());
    expect(result.state).toBe('actionable');
    expect(result.primaryAction?.step.id).toBe('step.high');
    expect(result.parallelActions.map((p) => p.step.id)).toEqual(['step.low']);
    expect(result.waits.map((p) => p.step.id)).toEqual(['step.wait']);
  });

  it('breaks a primary-action priority tie using active route step order, then id', () => {
    const a = task('step.b', { priority: 3 });
    const b = task('step.a', { priority: 3 });
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [a.id, b.id]);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([a, b]) });

    const result = resolveDestination(dest.id, g, context());
    expect(result.primaryAction?.step.id).toBe('step.b');
  });

  it('reports waiting when only ready waits remain', () => {
    const w = wait('step.wait');
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [w.id]);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([w]) });

    const result = resolveDestination(dest.id, g, context());
    expect(result.state).toBe('waiting');
    expect(result.primaryAction).toBeUndefined();
    expect(result.waits.map((p) => p.step.id)).toEqual(['step.wait']);
  });

  it('reports blocked when only blocked applicable work remains', () => {
    const blockedStep = task('step.blocked', { requirementIds: ['requirement.absent'] });
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [blockedStep.id]);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([blockedStep]) });

    const result = resolveDestination(dest.id, g, context());
    expect(result.state).toBe('blocked');
    expect(result.blocked.map((p) => p.step.id)).toEqual(['step.blocked']);
  });

  it('reports complete when all applicable work is complete or skipped', () => {
    const done = task('step.done');
    const skipped = task('step.skipped', { appliesWhen: { kind: 'factTruthy', fact: 'never' } });
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [done.id, skipped.id]);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([done, skipped]) });

    const result = resolveDestination(
      dest.id,
      g,
      context({ progress: progress({ manualCompletedStepIds: new Set([done.id]) }) }),
    );
    expect(result.state).toBe('complete');
  });
});

describe('resolveDestination: subjourney resolution', () => {
  it('resolves through a subjourney target and exposes the child task with its parent/child path', () => {
    const childTask = task('step.child-task');
    const childDest = destination('destination.child', ['route.child']);
    const childRoute = route('route.child', [childTask.id]);

    const sub = subjourney('step.subjourney', childDest.id);
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [sub.id]);

    const g = graph({
      destinations: index([parentDest, childDest]),
      routes: index([parentRoute, childRoute]),
      steps: index([sub, childTask]),
    });

    const result = resolveDestination(parentDest.id, g, context());
    expect(result.state).toBe('actionable');
    expect(result.primaryAction?.step.id).toBe('step.child-task');
    expect(result.primaryAction?.destinationPath).toEqual([parentDest.id, childDest.id]);
  });

  it('treats a subjourney step as complete only when its target Destination is complete', () => {
    const childTask = task('step.child-task');
    const childDest = destination('destination.child', ['route.child']);
    const childRoute = route('route.child', [childTask.id]);
    const sub = subjourney('step.subjourney', childDest.id);
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [sub.id]);

    const g = graph({
      destinations: index([parentDest, childDest]),
      routes: index([parentRoute, childRoute]),
      steps: index([sub, childTask]),
    });

    const complete = resolveDestination(
      parentDest.id,
      g,
      context({ progress: progress({ manualCompletedStepIds: new Set([childTask.id]) }) }),
    );
    expect(complete.state).toBe('complete');
  });

  it('is cycle-safe for subjourney cycles and reports deterministic evidence', () => {
    const stepA = subjourney('step.to-b', 'destination.b');
    const destA = destination('destination.a', ['route.a']);
    const routeA = route('route.a', [stepA.id]);

    const stepB = subjourney('step.to-a', 'destination.a');
    const destB = destination('destination.b', ['route.b']);
    const routeB = route('route.b', [stepB.id]);

    const g = graph({
      destinations: index([destA, destB]),
      routes: index([routeA, routeB]),
      steps: index([stepA, stepB]),
    });

    const result = resolveDestination(destA.id, g, context());
    // Must not throw / hang, and must report structural evidence rather than silently succeeding.
    expect(result.issues.some((issue) => issue.kind === 'cycle')).toBe(true);
  });
});

describe('resolveDestination: F1 subjourney local gating cannot be bypassed', () => {
  it('a blocked subjourney never exposes child work as actionable/parallel/waiting', () => {
    const childTask = task('step.child-task');
    const childDest = destination('destination.child', ['route.child']);
    const childRoute = route('route.child', [childTask.id]);

    const sub = subjourney('step.subjourney', childDest.id, { requirementIds: ['requirement.absent'] });
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [sub.id]);

    const g = graph({
      destinations: index([parentDest, childDest]),
      routes: index([parentRoute, childRoute]),
      steps: index([sub, childTask]),
    });

    const result = resolveDestination(parentDest.id, g, context());
    expect(result.state).toBe('blocked');
    expect(result.primaryAction).toBeUndefined();
    expect(result.parallelActions).toEqual([]);
    expect(result.blocked.map((p) => p.step.id)).toEqual(['step.subjourney']);
  });

  it('a skipped subjourney never exposes child work as active work', () => {
    const childTask = task('step.child-task');
    const childDest = destination('destination.child', ['route.child']);
    const childRoute = route('route.child', [childTask.id]);

    const sub = subjourney('step.subjourney', childDest.id, {
      appliesWhen: { kind: 'factTruthy', fact: 'never' },
    });
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [sub.id]);

    const g = graph({
      destinations: index([parentDest, childDest]),
      routes: index([parentRoute, childRoute]),
      steps: index([sub, childTask]),
    });

    const result = resolveDestination(parentDest.id, g, context());
    // No other work exists in the parent route once the only step is skipped.
    expect(result.state).toBe('complete');
    expect(result.primaryAction).toBeUndefined();
    expect(result.parallelActions).toEqual([]);
  });
});

describe('resolveDestination: F4 subjourney dependency completion', () => {
  it('a task depending on a subjourney is blocked until the child Destination completes', () => {
    const childTask = task('step.child-task');
    const childDest = destination('destination.child', ['route.child']);
    const childRoute = route('route.child', [childTask.id]);

    const sub = subjourney('step.subjourney', childDest.id);
    const dependentTask = task('step.dependent', { dependsOnStepIds: [sub.id] });
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [sub.id, dependentTask.id]);

    const g = graph({
      destinations: index([parentDest, childDest]),
      routes: index([parentRoute, childRoute]),
      steps: index([sub, childTask, dependentTask]),
    });

    const beforeChildCompletes = resolveDestination(parentDest.id, g, context());
    expect(beforeChildCompletes.blocked.map((p) => p.step.id)).toContain('step.dependent');
    expect(beforeChildCompletes.primaryAction?.step.id).toBe('step.child-task');

    const afterChildCompletes = resolveDestination(
      parentDest.id,
      g,
      context({ progress: progress({ manualCompletedStepIds: new Set([childTask.id]) }) }),
    );
    expect(afterChildCompletes.state).toBe('actionable');
    expect(afterChildCompletes.primaryAction?.step.id).toBe('step.dependent');
  });

  it('no manual/externalOutcome completion signal for the SubjourneyStep itself is necessary or sufficient', () => {
    const childTask = task('step.child-task');
    const childDest = destination('destination.child', ['route.child']);
    const childRoute = route('route.child', [childTask.id]);

    const sub = subjourney('step.subjourney', childDest.id);
    const dependentTask = task('step.dependent', { dependsOnStepIds: [sub.id] });
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [sub.id, dependentTask.id]);

    const g = graph({
      destinations: index([parentDest, childDest]),
      routes: index([parentRoute, childRoute]),
      steps: index([sub, childTask, dependentTask]),
    });

    // Marking the SubjourneyStep id itself complete must have no effect: the
    // child Destination (childTask) is still incomplete.
    const result = resolveDestination(
      parentDest.id,
      g,
      context({ progress: progress({ manualCompletedStepIds: new Set([sub.id]) }) }),
    );
    expect(result.blocked.map((p) => p.step.id)).toContain('step.dependent');
  });
});

describe('resolveDestination: F5 unresolved selected Steps never produce complete', () => {
  it('a route containing only a missing Step resolves to unresolved, never complete', () => {
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', ['step.missing']);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: new Map() });

    const result = resolveDestination(dest.id, g, context());
    expect(result.state).toBe('unresolved');
    expect(result.issues.some((issue) => issue.kind === 'missingReference' && issue.id === 'step.missing')).toBe(true);
  });

  it('completed known Steps plus one missing selected Step resolves to unresolved, never complete', () => {
    const done = task('step.done');
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [done.id, 'step.missing']);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([done]) });

    const result = resolveDestination(
      dest.id,
      g,
      context({ progress: progress({ manualCompletedStepIds: new Set([done.id]) }) }),
    );
    expect(result.state).toBe('unresolved');
  });

  it('still exposes other valid actionable work alongside the resolver issue', () => {
    const actionableTask = task('step.actionable');
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [actionableTask.id, 'step.missing']);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([actionableTask]) });

    const result = resolveDestination(dest.id, g, context());
    expect(result.state).toBe('actionable');
    expect(result.primaryAction?.step.id).toBe('step.actionable');
    expect(result.issues.some((issue) => issue.kind === 'missingReference')).toBe(true);
  });
});

describe('resolveDestination: F6 parallel actionable sibling subjourneys', () => {
  it('two ready sibling subjourneys each with actionable work: one primary, the other parallel', () => {
    const childTaskLow = task('step.child-low');
    const childDestLow = destination('destination.child-low', ['route.child-low']);
    const childRouteLow = route('route.child-low', [childTaskLow.id]);

    const childTaskHigh = task('step.child-high');
    const childDestHigh = destination('destination.child-high', ['route.child-high']);
    const childRouteHigh = route('route.child-high', [childTaskHigh.id]);

    const subLow = subjourney('step.sub-low', childDestLow.id, { priority: 1 });
    const subHigh = subjourney('step.sub-high', childDestHigh.id, { priority: 5 });
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [subLow.id, subHigh.id]);

    const g = graph({
      destinations: index([parentDest, childDestLow, childDestHigh]),
      routes: index([parentRoute, childRouteLow, childRouteHigh]),
      steps: index([subLow, subHigh, childTaskLow, childTaskHigh]),
    });

    const result = resolveDestination(parentDest.id, g, context());
    expect(result.state).toBe('actionable');
    expect(result.primaryAction?.step.id).toBe('step.child-high');
    expect(result.parallelActions.map((p) => p.step.id)).toContain('step.child-low');
  });

  it('does not descend through a blocked or skipped sibling subjourney', () => {
    const childTaskReady = task('step.child-ready');
    const childDestReady = destination('destination.child-ready', ['route.child-ready']);
    const childRouteReady = route('route.child-ready', [childTaskReady.id]);

    const childTaskBlockedSide = task('step.child-blocked-side');
    const childDestBlockedSide = destination('destination.child-blocked-side', ['route.child-blocked-side']);
    const childRouteBlockedSide = route('route.child-blocked-side', [childTaskBlockedSide.id]);

    const subReady = subjourney('step.sub-ready', childDestReady.id);
    const subBlocked = subjourney('step.sub-blocked', childDestBlockedSide.id, {
      requirementIds: ['requirement.absent'],
    });
    const parentDest = destination('destination.parent', ['route.parent']);
    const parentRoute = route('route.parent', [subReady.id, subBlocked.id]);

    const g = graph({
      destinations: index([parentDest, childDestReady, childDestBlockedSide]),
      routes: index([parentRoute, childRouteReady, childRouteBlockedSide]),
      steps: index([subReady, subBlocked, childTaskReady, childTaskBlockedSide]),
    });

    const result = resolveDestination(parentDest.id, g, context());
    expect(result.state).toBe('actionable');
    expect(result.primaryAction?.step.id).toBe('step.child-ready');
    expect(result.parallelActions).toEqual([]);
    expect(result.blocked.map((p) => p.step.id)).toEqual(['step.sub-blocked']);
  });
});

describe('resolveDestination: missing references and determinism', () => {
  it('reports a missing destination id deterministically', () => {
    const result = resolveDestination('destination.missing', graph(), context());
    expect(result.state).toBe('unresolved');
    expect(result.issues).toEqual([{ kind: 'missingReference', entityKind: 'destination', id: 'destination.missing' }]);
  });

  it('reports a missing step reference without crashing', () => {
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', ['step.missing']);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: new Map() });
    const result = resolveDestination(dest.id, g, context());
    expect(result.issues.some((issue) => issue.kind === 'missingReference' && issue.id === 'step.missing')).toBe(true);
  });

  it('produces the same result for the same input on repeated calls', () => {
    const t = task('step.t');
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [t.id]);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([t]) });
    const ctx = context();

    const first = resolveDestination(dest.id, g, ctx);
    const second = resolveDestination(dest.id, g, ctx);
    expect(second.state).toBe(first.state);
    expect(second.primaryAction?.step.id).toBe(first.primaryAction?.step.id);
  });

  it('does not mutate the graph or context inputs', () => {
    const t = task('step.t');
    const dest = destination('destination.d', ['route.r']);
    const r = route('route.r', [t.id]);
    const g = graph({ destinations: index([dest]), routes: index([r]), steps: index([t]) });
    const ctx = context();
    const graphSnapshot = structuredClone({
      destinations: Object.fromEntries(g.destinations),
      routes: Object.fromEntries(g.routes),
      steps: Object.fromEntries(g.steps),
    });

    resolveDestination(dest.id, g, ctx);

    expect(Object.fromEntries(g.destinations)).toEqual(graphSnapshot.destinations);
    expect(Object.fromEntries(g.routes)).toEqual(graphSnapshot.routes);
    expect(Object.fromEntries(g.steps)).toEqual(graphSnapshot.steps);
  });

  it('is deterministic across repeated calls for a graph containing a subjourney cycle', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const stepA = subjourney('step.to-b', 'destination.b');
        const destA = destination('destination.a', ['route.a']);
        const routeA = route('route.a', [stepA.id]);

        const stepB = subjourney('step.to-a', 'destination.a');
        const destB = destination('destination.b', ['route.b']);
        const routeB = route('route.b', [stepB.id]);

        const g = graph({
          destinations: index([destA, destB]),
          routes: index([routeA, routeB]),
          steps: index([stepA, stepB]),
        });

        const first = resolveDestination(destA.id, g, context());
        const second = resolveDestination(destA.id, g, context());
        expect(second.state).toBe(first.state);
        expect(second.issues.length).toBe(first.issues.length);
      }),
    );
  });
});
