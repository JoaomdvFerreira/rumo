import { sortByPriority } from './priority';
import type { EntityIndex, ResolverIssue } from './resolver';
import { cycleDetected, missingReference } from './resolver';
import { selectRoute } from './route';
import type { RoutingContext } from './runtime';
import { resolveStep } from './step';
import type { StepResolution } from './step';
import type { Requirement, RequirementGroup } from '../model/requirement';
import type { Destination, Route, RouteVariant } from '../model/routing';
import type { Step } from '../model/step';

/**
 * Everything the engine needs to resolve any Destination in the content
 * graph, including subjourney targets. All indexes are read-only lookup
 * tables; the engine never mutates canonical content.
 */
export interface DestinationGraph {
  readonly destinations: EntityIndex<Destination>;
  readonly routes: EntityIndex<Route>;
  readonly routeVariants: EntityIndex<RouteVariant>;
  readonly steps: EntityIndex<Step>;
  readonly requirements: EntityIndex<Requirement>;
  readonly requirementGroups: EntityIndex<RequirementGroup>;
}

/** A step resolved within the path of Destinations that led to it (root first). */
export interface PathStep {
  readonly step: Step;
  readonly state: StepResolution['state'];
  /** Destination ids from the root Destination down to (and including) the Destination that owns this step. */
  readonly destinationPath: readonly string[];
}

export type DestinationRouteState = 'actionable' | 'waiting' | 'blocked' | 'complete' | 'unresolved';

export interface DestinationResolution {
  readonly destinationId: string;
  readonly state: DestinationRouteState;
  /** The single next executable task ("FAÇA ISTO AGORA"): never a wait. */
  readonly primaryAction: PathStep | undefined;
  /** Other executable ready tasks besides the primary action. */
  readonly parallelActions: readonly PathStep[];
  /** Ready waits, reported separately from actionable work. */
  readonly waits: readonly PathStep[];
  /** All applicable, non-complete/skipped steps still blocked. */
  readonly blocked: readonly PathStep[];
  readonly issues: readonly ResolverIssue[];
}

export function resolveDestination(
  destinationId: string,
  graph: DestinationGraph,
  context: RoutingContext,
): DestinationResolution {
  return resolveDestinationInternal(destinationId, graph, context, [], new Set());
}

function unresolvedDestination(destinationId: string, issues: ResolverIssue[]): DestinationResolution {
  return {
    destinationId,
    state: 'unresolved',
    primaryAction: undefined,
    parallelActions: [],
    waits: [],
    blocked: [],
    issues,
  };
}

function resolveDestinationInternal(
  destinationId: string,
  graph: DestinationGraph,
  context: RoutingContext,
  ancestorPath: readonly string[],
  visiting: ReadonlySet<string>,
): DestinationResolution {
  if (visiting.has(destinationId)) {
    return unresolvedDestination(destinationId, [cycleDetected('destination', destinationId)]);
  }

  const destination = graph.destinations.get(destinationId);
  if (destination === undefined) {
    return unresolvedDestination(
      destinationId,
      [missingReference('destination', destinationId, ancestorPath[ancestorPath.length - 1])],
    );
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(destinationId);
  const path = [...ancestorPath, destinationId];

  const selection = selectRoute(destination, graph.routes, graph.routeVariants, context.facts);
  const issues: ResolverIssue[] = [...selection.issues];

  if (selection.route === undefined) {
    return { ...unresolvedDestination(destinationId, issues), state: 'unresolved' };
  }

  const actionable: PathStep[] = [];
  const waiting: PathStep[] = [];
  const blocked: PathStep[] = [];
  const subjourneyResults: { step: Step; resolution: DestinationResolution }[] = [];
  let allCompleteOrSkipped = true;

  for (const stepId of selection.stepIds) {
    const step = graph.steps.get(stepId);
    if (step === undefined) {
      issues.push(missingReference('step', stepId, selection.route.id));
      continue;
    }

    const stepResolutionInputs = {
      steps: graph.steps,
      requirements: graph.requirements,
      requirementGroups: graph.requirementGroups,
      facts: context.facts,
      progress: context.progress,
    };

    if (step.kind === 'subjourney') {
      const childResolution = resolveDestinationInternal(
        step.destinationId,
        graph,
        context,
        path,
        nextVisiting,
      );
      issues.push(...childResolution.issues);
      subjourneyResults.push({ step, resolution: childResolution });

      const localState = resolveStep(step, stepResolutionInputs);
      issues.push(...localState.issues);

      if (localState.state === 'skipped') {
        continue;
      }
      if (localState.state === 'blocked') {
        blocked.push({ step, state: 'blocked', destinationPath: path });
        allCompleteOrSkipped = false;
        continue;
      }

      const subjourneyComplete = childResolution.state === 'complete';
      if (subjourneyComplete) {
        continue;
      }
      allCompleteOrSkipped = false;
      continue;
    }

    const resolution = resolveStep(step, stepResolutionInputs);
    issues.push(...resolution.issues);

    switch (resolution.state) {
      case 'skipped':
      case 'complete':
        continue;
      case 'blocked':
        blocked.push({ step, state: resolution.state, destinationPath: path });
        allCompleteOrSkipped = false;
        continue;
      case 'actionable':
        actionable.push({ step, state: resolution.state, destinationPath: path });
        allCompleteOrSkipped = false;
        continue;
      case 'waiting':
        waiting.push({ step, state: resolution.state, destinationPath: path });
        allCompleteOrSkipped = false;
        continue;
    }
  }

  if (actionable.length > 0) {
    const ordered = sortByPriority(actionable.map((entry) => ({ id: entry.step.id, priority: entry.step.priority, entry })));
    const [primary, ...rest] = ordered.map((o) => o.entry);
    return {
      destinationId,
      state: 'actionable',
      primaryAction: primary,
      parallelActions: rest,
      waits: waiting,
      blocked,
      issues,
    };
  }

  const actionableSubjourney = subjourneyResults.find(
    (entry) => entry.resolution.state === 'actionable' && entry.resolution.primaryAction !== undefined,
  );
  if (actionableSubjourney !== undefined) {
    const child = actionableSubjourney.resolution;
    return {
      destinationId,
      state: 'actionable',
      primaryAction: child.primaryAction,
      parallelActions: child.parallelActions,
      waits: [...waiting, ...child.waits],
      blocked: [...blocked, ...child.blocked],
      issues,
    };
  }

  if (waiting.length > 0 || subjourneyResults.some((entry) => entry.resolution.state === 'waiting')) {
    const subjourneyWaits = subjourneyResults.flatMap((entry) =>
      entry.resolution.state === 'waiting' ? entry.resolution.waits : [],
    );
    return {
      destinationId,
      state: 'waiting',
      primaryAction: undefined,
      parallelActions: [],
      waits: [...waiting, ...subjourneyWaits],
      blocked,
      issues,
    };
  }

  if (blocked.length > 0 || subjourneyResults.some((entry) => entry.resolution.state === 'blocked')) {
    const subjourneyBlocked = subjourneyResults.flatMap((entry) =>
      entry.resolution.state === 'blocked' ? entry.resolution.blocked : [],
    );
    return {
      destinationId,
      state: 'blocked',
      primaryAction: undefined,
      parallelActions: [],
      waits: [],
      blocked: [...blocked, ...subjourneyBlocked],
      issues,
    };
  }

  const state: DestinationRouteState = allCompleteOrSkipped ? 'complete' : 'unresolved';
  return { destinationId, state, primaryAction: undefined, parallelActions: [], waits: [], blocked: [], issues };
}
