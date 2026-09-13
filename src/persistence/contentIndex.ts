import { fingerprintSemanticValue, requirementFingerprint, stepFingerprint } from './fingerprint';
import type { RevalidationContentIndex } from './revalidate';
import type { ContentGraph } from '../content/graph';
import type { SubjourneyStep } from '../domain/model/step';

/**
 * Computes, for every Destination, the full set of Step ids structurally
 * reachable from it: every step declared on any of its Routes/RouteVariants,
 * plus (transitively) every step reachable from a subjourney step's target
 * Destination. This is deliberately independent of `appliesWhen` --
 * structural reachability (F1 case 4: "still exists globally but is no
 * longer reachable/relevant to that session") is about whether a step is
 * still part of this Destination's content graph at all, not whether it
 * currently applies to a given FactSet. A step that exists globally but was
 * moved to an unrelated Destination/Route is no longer reachable from a
 * session rooted elsewhere, so old progress against it can never be
 * silently trusted for that session again.
 */
function computeReachableStepIdsByDestination(content: ContentGraph): ReadonlyMap<string, ReadonlySet<string>> {
  const destinations = new Map(content.destinations.map((destination) => [destination.id, destination]));
  const routes = new Map(content.routes.map((route) => [route.id, route]));
  const routeVariants = new Map(content.routeVariants.map((variant) => [variant.id, variant]));
  const steps = new Map(content.steps.map((step) => [step.id, step]));

  const cache = new Map<string, ReadonlySet<string>>();

  function reachableFrom(destinationId: string, visiting: ReadonlySet<string>): ReadonlySet<string> {
    const cached = cache.get(destinationId);
    if (cached) return cached;
    if (visiting.has(destinationId)) return new Set();

    const destination = destinations.get(destinationId);
    if (destination === undefined) return new Set();

    const nextVisiting = new Set(visiting);
    nextVisiting.add(destinationId);

    const reachable = new Set<string>();
    const subjourneySteps: SubjourneyStep[] = [];

    for (const routeId of destination.routeIds) {
      const route = routes.get(routeId);
      if (route === undefined) continue;

      for (const stepId of route.stepIds) {
        reachable.add(stepId);
        const step = steps.get(stepId);
        if (step?.kind === 'subjourney') subjourneySteps.push(step);
      }

      for (const variantId of route.variantIds) {
        const variant = routeVariants.get(variantId);
        if (variant === undefined) continue;
        for (const stepId of variant.stepIds) {
          reachable.add(stepId);
          const step = steps.get(stepId);
          if (step?.kind === 'subjourney') subjourneySteps.push(step);
        }
      }
    }

    for (const subjourneyStep of subjourneySteps) {
      for (const childStepId of reachableFrom(subjourneyStep.destinationId, nextVisiting)) {
        reachable.add(childStepId);
      }
    }

    cache.set(destinationId, reachable);
    return reachable;
  }

  const result = new Map<string, ReadonlySet<string>>();
  for (const destination of content.destinations) {
    result.set(destination.id, reachableFrom(destination.id, new Set()));
  }
  return result;
}

/**
 * The full current-content surface revalidation needs: which ids still
 * exist, their semantic fingerprints, and which step ids are structurally
 * reachable from each Destination. Callers build this from the live
 * `ContentGraph` (WU004) rather than this module importing content
 * directly, so persistence stays decoupled from how content is assembled.
 */
export function buildRevalidationContentIndex(content: ContentGraph): RevalidationContentIndex {
  const reachableStepIdsByDestination = computeReachableStepIdsByDestination(content);
  const destinationsByRoute = new Map<string, string[]>();
  for (const destination of content.destinations) {
    for (const routeId of destination.routeIds) {
      const ids = destinationsByRoute.get(routeId) ?? [];
      ids.push(destination.id);
      destinationsByRoute.set(routeId, ids);
    }
  }

  const routesByVariant = new Map<string, string[]>();
  for (const route of content.routes) {
    for (const variantId of route.variantIds) {
      const ids = routesByVariant.get(variantId) ?? [];
      ids.push(route.id);
      routesByVariant.set(variantId, ids);
    }
  }

  const stepFingerprints = new Map<string, string>();
  for (const step of content.steps) {
    const routePlacements = content.routes
      .filter((route) => route.stepIds.includes(step.id))
      .map((route) => ({ route, destinationIds: [...(destinationsByRoute.get(route.id) ?? [])].sort() }));
    const variantPlacements = content.routeVariants
      .filter((variant) => variant.stepIds.includes(step.id))
      .map((variant) => ({
        variant,
        parentRoutes: (routesByVariant.get(variant.id) ?? []).sort().map((routeId) => ({
          route: content.routes.find((route) => route.id === routeId),
          destinationIds: [...(destinationsByRoute.get(routeId) ?? [])].sort(),
        })),
      }));
    stepFingerprints.set(
      step.id,
      fingerprintSemanticValue({ entity: stepFingerprint(step), routePlacements, variantPlacements }),
    );
  }

  const requirementGroupsByRequirement = new Map<string, typeof content.requirementGroups>();
  for (const group of content.requirementGroups) {
    for (const requirementId of group.requirementIds) {
      const groups = requirementGroupsByRequirement.get(requirementId) ?? [];
      groups.push(group);
      requirementGroupsByRequirement.set(requirementId, groups);
    }
  }

  const requirementFingerprints = new Map<string, string>();
  for (const requirement of content.requirements) {
    const groups = requirementGroupsByRequirement.get(requirement.id) ?? [];
    const referencingSteps = content.steps.filter(
      (step) =>
        step.requirementIds.includes(requirement.id) ||
        step.requirementGroupIds.some((groupId) => groups.some((group) => group.id === groupId)),
    );
    requirementFingerprints.set(
      requirement.id,
      fingerprintSemanticValue({
        entity: requirementFingerprint(requirement),
        groups,
        referencingSteps: referencingSteps.map((step) => ({
          id: step.id,
          fingerprint: stepFingerprints.get(step.id),
        })),
      }),
    );
  }

  const groupsById = new Map(content.requirementGroups.map((group) => [group.id, group]));
  const stepsById = new Map(content.steps.map((step) => [step.id, step]));
  const reachableRequirementIdsByDestination = new Map<string, ReadonlySet<string>>();
  for (const [destinationId, reachableStepIds] of reachableStepIdsByDestination) {
    const requirementIds = new Set<string>();
    for (const stepId of reachableStepIds) {
      const step = stepsById.get(stepId);
      if (step === undefined) continue;
      step.requirementIds.forEach((id) => requirementIds.add(id));
      for (const groupId of step.requirementGroupIds) {
        groupsById.get(groupId)?.requirementIds.forEach((id) => requirementIds.add(id));
      }
    }
    reachableRequirementIdsByDestination.set(destinationId, requirementIds);
  }

  return {
    destinationIds: new Set(content.destinations.map((destination) => destination.id)),
    stepFingerprints,
    requirementFingerprints,
    reachableStepIdsByDestination,
    reachableRequirementIdsByDestination,
  };
}
