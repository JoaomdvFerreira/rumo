import type { AppBootstrap, SerializableRevalidationContentIndex } from './bootstrap';
import type { RevalidationContentIndex } from '../../persistence/revalidate';
import type { DestinationGraph } from '../../domain/engine/destination';

/**
 * Client-safe reconstruction of the plain bootstrap payload back into the
 * Map/Set-based shapes the engine (WU003) and persistence (WU005) expect.
 * This module imports no Node-only code -- it only rebuilds standard
 * `Map`/`Set` instances from arrays, so it is safe to import from a Client
 * Component.
 */
export function toDestinationGraph(bootstrap: AppBootstrap): DestinationGraph {
  return {
    destinations: new Map(bootstrap.destinations.map((entity) => [entity.id, entity])),
    routes: new Map(bootstrap.routes.map((entity) => [entity.id, entity])),
    routeVariants: new Map(bootstrap.routeVariants.map((entity) => [entity.id, entity])),
    steps: new Map(bootstrap.steps.map((entity) => [entity.id, entity])),
    requirements: new Map(bootstrap.requirements.map((entity) => [entity.id, entity])),
    requirementGroups: new Map(bootstrap.requirementGroups.map((entity) => [entity.id, entity])),
  };
}

export function toRevalidationContentIndex(
  index: SerializableRevalidationContentIndex,
): RevalidationContentIndex {
  return {
    destinationIds: new Set(index.destinationIds),
    stepFingerprints: new Map(index.stepFingerprints),
    requirementFingerprints: new Map(index.requirementFingerprints),
    reachableStepIdsByDestination: new Map(
      index.reachableStepIdsByDestination.map(([id, ids]) => [id, new Set(ids)]),
    ),
    reachableRequirementIdsByDestination: new Map(
      index.reachableRequirementIdsByDestination.map(([id, ids]) => [id, new Set(ids)]),
    ),
  };
}
