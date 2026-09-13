import { isApplicable } from './condition';
import { sortByPriority } from './priority';
import type { EntityIndex, ResolverIssue } from './resolver';
import { missingReference } from './resolver';
import type { FactSet } from '../model/fact';
import type { Destination, Route, RouteVariant } from '../model/routing';

/**
 * Deterministic Route/RouteVariant selection:
 * 1. resolve candidate Routes referenced by the Destination;
 * 2. keep only applicable Routes (missing `appliesWhen` => always applies);
 * 3. select highest priority, then declaration order (Destination.routeIds
 *    order), then stable id.
 *
 * For the selected Route: resolve its RouteVariants, keep applicable ones,
 * and if any apply, select one by the same rule; otherwise fall back to the
 * Route's own `stepIds`. Missing references are reported as resolver
 * evidence rather than silently skipped or thrown.
 */
export interface RouteSelectionResult {
  readonly route: Route | undefined;
  readonly variant: RouteVariant | undefined;
  readonly stepIds: readonly string[];
  readonly issues: readonly ResolverIssue[];
}

export function selectRoute(
  destination: Destination,
  routes: EntityIndex<Route>,
  variants: EntityIndex<RouteVariant>,
  facts: FactSet,
): RouteSelectionResult {
  const issues: ResolverIssue[] = [];
  const applicableRoutes: Route[] = [];

  for (const routeId of destination.routeIds) {
    const route = routes.get(routeId);
    if (route === undefined) {
      issues.push(missingReference('route', routeId, destination.id));
      continue;
    }
    if (isApplicable(route.appliesWhen, facts)) {
      applicableRoutes.push(route);
    }
  }

  const route = sortByPriority(applicableRoutes)[0];
  if (route === undefined) {
    return { route: undefined, variant: undefined, stepIds: [], issues };
  }

  const applicableVariants: RouteVariant[] = [];
  for (const variantId of route.variantIds) {
    const variant = variants.get(variantId);
    if (variant === undefined) {
      issues.push(missingReference('routeVariant', variantId, route.id));
      continue;
    }
    if (isApplicable(variant.appliesWhen, facts)) {
      applicableVariants.push(variant);
    }
  }

  const variant = sortByPriority(applicableVariants)[0];
  const stepIds = variant ? variant.stepIds : route.stepIds;

  return { route, variant, stepIds, issues };
}
