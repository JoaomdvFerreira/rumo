import { sortByPriority } from './priority';
import type { EntityIndex, ResolverIssue } from './resolver';
import { cycleDetected, missingReference } from './resolver';
import { selectRoute } from './route';
import type { RoutingContext } from './runtime';
import { isStepApplicable, resolveStep } from './step';
import type { StepResolution, StepResolutionInputs } from './step';
import type { Requirement, RequirementGroup } from '../model/requirement';
import type { Destination, Route, RouteVariant } from '../model/routing';
import type { Step, SubjourneyStep } from '../model/step';

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

/** Ready sibling subjourney: a locally-applicable, unblocked SubjourneyStep and its resolved child Destination. */
interface ReadySubjourney {
  readonly step: SubjourneyStep;
  readonly resolution: DestinationResolution;
}

export function resolveDestination(
  destinationId: string,
  graph: DestinationGraph,
  context: RoutingContext,
): DestinationResolution {
  return resolveDestinationInternal(destinationId, graph, context, [], new Set());
}

function emptyResolution(destinationId: string, state: DestinationRouteState, issues: ResolverIssue[]): DestinationResolution {
  return {
    destinationId,
    state,
    primaryAction: undefined,
    parallelActions: [],
    waits: [],
    blocked: [],
    issues,
  };
}

/**
 * Resolves whether a Destination is complete, for use as a Step's
 * subjourney-completion signal (F4). Cycle-safe: a Destination already on
 * the current recursion stack is deterministically treated as not complete
 * rather than recursed into again, since a cycle can never resolve to
 * "complete" by construction.
 */
function isDestinationComplete(
  destinationId: string,
  graph: DestinationGraph,
  context: RoutingContext,
  ancestorPath: readonly string[],
  visiting: ReadonlySet<string>,
): boolean {
  if (visiting.has(destinationId)) return false;
  return resolveDestinationInternal(destinationId, graph, context, ancestorPath, visiting).state === 'complete';
}

function resolveDestinationInternal(
  destinationId: string,
  graph: DestinationGraph,
  context: RoutingContext,
  ancestorPath: readonly string[],
  visiting: ReadonlySet<string>,
): DestinationResolution {
  if (visiting.has(destinationId)) {
    return emptyResolution(destinationId, 'unresolved', [cycleDetected('destination', destinationId)]);
  }

  const destination = graph.destinations.get(destinationId);
  if (destination === undefined) {
    return emptyResolution(destinationId, 'unresolved', [
      missingReference('destination', destinationId, ancestorPath[ancestorPath.length - 1]),
    ]);
  }

  const nextVisiting = new Set(visiting);
  nextVisiting.add(destinationId);
  const path = [...ancestorPath, destinationId];

  const selection = selectRoute(destination, graph.routes, graph.routeVariants, context.facts);
  const issues: ResolverIssue[] = [...selection.issues];

  if (selection.route === undefined) {
    return emptyResolution(destinationId, 'unresolved', issues);
  }

  const resolveSubjourneyCompletion = (targetDestinationId: string): boolean =>
    isDestinationComplete(targetDestinationId, graph, context, path, nextVisiting);

  const stepResolutionInputs: StepResolutionInputs = {
    steps: graph.steps,
    requirements: graph.requirements,
    requirementGroups: graph.requirementGroups,
    facts: context.facts,
    progress: context.progress,
    resolveSubjourneyCompletion,
  };

  const actionable: PathStep[] = [];
  const waiting: PathStep[] = [];
  const blocked: PathStep[] = [];
  const readySubjourneys: ReadySubjourney[] = [];
  let hasUnresolvedSelectedStep = false;
  let allCompleteOrSkipped = true;

  for (const stepId of selection.stepIds) {
    const step = graph.steps.get(stepId);
    if (step === undefined) {
      issues.push(missingReference('step', stepId, selection.route.id));
      hasUnresolvedSelectedStep = true;
      continue;
    }

    if (step.kind === 'subjourney') {
      // F1: local gating first. A skipped or blocked SubjourneyStep must
      // never expose its child Destination's work as active routing work.
      // Only a locally ready (applicable and unblocked) subjourney is
      // traversed into its target Destination at all.
      if (!isStepApplicable(step, context.facts)) {
        continue;
      }

      const localResolution = resolveStep(step, stepResolutionInputs);
      issues.push(...localResolution.issues);

      if (localResolution.state === 'blocked') {
        blocked.push({ step, state: 'blocked', destinationPath: path });
        allCompleteOrSkipped = false;
        continue;
      }

      if (localResolution.state === 'complete') {
        continue;
      }

      // Locally ready (not skipped/blocked/complete): resolve the child
      // Destination and let its own actionable/waiting/blocked/unresolved
      // work flow into this Destination's resolution.
      const childResolution = resolveDestinationInternal(step.destinationId, graph, context, path, nextVisiting);
      issues.push(...childResolution.issues);
      allCompleteOrSkipped = false;
      readySubjourneys.push({ step, resolution: childResolution });
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

  return buildResolution(destinationId, issues, actionable, waiting, blocked, readySubjourneys, allCompleteOrSkipped, hasUnresolvedSelectedStep);
}

/**
 * F6: deterministic ordering of ready sibling subjourneys, by parent
 * SubjourneyStep priority desc, then active-route step order (the order
 * `readySubjourneys` was collected in, which follows `selection.stepIds`),
 * then stable id -- the same tie-break rule used everywhere else.
 */
function orderReadySubjourneys(readySubjourneys: readonly ReadySubjourney[]): ReadySubjourney[] {
  return sortByPriority(
    readySubjourneys.map((entry) => ({ id: entry.step.id, priority: entry.step.priority, entry })),
  ).map((wrapped) => wrapped.entry);
}

function buildResolution(
  destinationId: string,
  issues: ResolverIssue[],
  actionable: PathStep[],
  waiting: PathStep[],
  blocked: PathStep[],
  readySubjourneys: ReadySubjourney[],
  allCompleteOrSkipped: boolean,
  hasUnresolvedSelectedStep: boolean,
): DestinationResolution {
  const orderedSubjourneys = orderReadySubjourneys(readySubjourneys);
  const actionableSubjourneys = orderedSubjourneys.filter(
    (entry) => entry.resolution.state === 'actionable' && entry.resolution.primaryAction !== undefined,
  );

  const allWaitsFromSubjourneys = readySubjourneys.flatMap((entry) => entry.resolution.waits);
  const allBlockedFromSubjourneys = readySubjourneys.flatMap((entry) => entry.resolution.blocked);

  if (actionable.length > 0 || actionableSubjourneys.length > 0) {
    // Direct actionable steps and actionable sibling subjourneys compete for
    // the primary/parallel slots under one deterministic order: priority
    // desc (a subjourney candidate carries its parent SubjourneyStep's
    // priority), then declaration/collection order, then stable id.
    const orderedDirect = sortByPriority(
      actionable.map((entry) => ({ id: entry.step.id, priority: entry.step.priority, entry })),
    ).map((wrapped) => wrapped.entry);

    type Candidate =
      | { readonly id: string; readonly priority: number; readonly kind: 'direct'; readonly pathStep: PathStep }
      | { readonly id: string; readonly priority: number; readonly kind: 'subjourney'; readonly child: DestinationResolution };

    const directCandidates: Candidate[] = orderedDirect.map((entry) => ({
      id: entry.step.id,
      priority: entry.step.priority,
      kind: 'direct',
      pathStep: entry,
    }));
    const subjourneyCandidates: Candidate[] = actionableSubjourneys.map((entry) => ({
      id: entry.step.id,
      priority: entry.step.priority,
      kind: 'subjourney',
      child: entry.resolution,
    }));

    const [winner, ...rest] = sortByPriority([...directCandidates, ...subjourneyCandidates]);

    const primaryAction = winner.kind === 'direct' ? winner.pathStep : (winner.child.primaryAction as PathStep);

    const parallelActions: PathStep[] = [];
    for (const candidate of rest) {
      if (candidate.kind === 'direct') {
        parallelActions.push(candidate.pathStep);
      } else {
        if (candidate.child.primaryAction) parallelActions.push(candidate.child.primaryAction);
        parallelActions.push(...candidate.child.parallelActions);
      }
    }
    if (winner.kind === 'subjourney') {
      parallelActions.push(...winner.child.parallelActions);
    }

    return {
      destinationId,
      state: 'actionable',
      primaryAction,
      parallelActions,
      waits: [...waiting, ...allWaitsFromSubjourneys],
      blocked: [...blocked, ...allBlockedFromSubjourneys],
      issues,
    };
  }

  const allWaits = [...waiting, ...allWaitsFromSubjourneys];
  if (allWaits.length > 0) {
    return {
      destinationId,
      state: 'waiting',
      primaryAction: undefined,
      parallelActions: [],
      waits: allWaits,
      blocked: [...blocked, ...allBlockedFromSubjourneys],
      issues,
    };
  }

  const allBlocked = [...blocked, ...allBlockedFromSubjourneys];
  if (allBlocked.length > 0) {
    return {
      destinationId,
      state: 'blocked',
      primaryAction: undefined,
      parallelActions: [],
      waits: [],
      blocked: allBlocked,
      issues,
    };
  }

  // F5: a Destination never resolves to `complete` when a selected Step
  // reference could not be resolved, or a ready subjourney itself resolved
  // as unresolved -- there is unresolved selected work, so the honest state
  // is `unresolved`, never a false `complete`.
  const anySubjourneyUnresolved = readySubjourneys.some((entry) => entry.resolution.state === 'unresolved');
  const isComplete = allCompleteOrSkipped && !hasUnresolvedSelectedStep && !anySubjourneyUnresolved;

  return emptyResolution(destinationId, isComplete ? 'complete' : 'unresolved', issues);
}
