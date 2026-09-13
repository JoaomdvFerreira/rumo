import { describe, expect, it } from 'vitest';

import { selectRoute } from './route';
import type { Destination, Route, RouteVariant } from '../model/routing';

function index<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

const destination: Destination = {
  id: 'destination.register-new-address',
  title: 'Register your new address',
  description: 'Register the new address with the municipality.',
  routeIds: ['route.online', 'route.in-person'],
};

const routeOnline: Route = {
  id: 'route.online',
  title: 'Online',
  priority: 5,
  stepIds: ['step.submit-online'],
  variantIds: [],
};

const routeInPerson: Route = {
  id: 'route.in-person',
  title: 'In person',
  priority: 1,
  stepIds: ['step.visit-office'],
  variantIds: [],
};

describe('selectRoute', () => {
  it('selects the highest priority applicable route', () => {
    const routes = index([routeOnline, routeInPerson]);
    const result = selectRoute(destination, routes, new Map(), {});
    expect(result.route?.id).toBe('route.online');
    expect(result.stepIds).toEqual(['step.submit-online']);
  });

  it('skips non-applicable routes', () => {
    const gatedOnline: Route = { ...routeOnline, appliesWhen: { kind: 'factTruthy', fact: 'household.hasOnlineAccess' } };
    const routes = index([gatedOnline, routeInPerson]);
    const result = selectRoute(destination, routes, new Map(), {});
    expect(result.route?.id).toBe('route.in-person');
  });

  it('breaks a route priority tie using declaration order in Destination.routeIds', () => {
    const tiedOnline: Route = { ...routeOnline, priority: 1 };
    const tiedInPerson: Route = { ...routeInPerson, priority: 1 };
    const routes = index([tiedOnline, tiedInPerson]);
    const result = selectRoute(destination, routes, new Map(), {});
    // destination.routeIds lists route.online first
    expect(result.route?.id).toBe('route.online');
  });

  it('reports a missing route reference deterministically and continues resolving others', () => {
    const routes = index([routeInPerson]);
    const result = selectRoute(destination, routes, new Map(), {});
    expect(result.route?.id).toBe('route.in-person');
    expect(result.issues).toEqual([
      { kind: 'missingReference', entityKind: 'route', id: 'route.online', referencedFrom: destination.id },
    ]);
  });

  it('returns no route and structured evidence when no candidate applies', () => {
    const gatedOnline: Route = { ...routeOnline, appliesWhen: { kind: 'factTruthy', fact: 'x' } };
    const gatedInPerson: Route = { ...routeInPerson, appliesWhen: { kind: 'factTruthy', fact: 'y' } };
    const routes = index([gatedOnline, gatedInPerson]);
    const result = selectRoute(destination, routes, new Map(), {});
    expect(result.route).toBeUndefined();
    expect(result.stepIds).toEqual([]);
  });

  describe('variant selection/fallback', () => {
    const routeWithVariants: Route = { ...routeOnline, variantIds: ['routeVariant.express', 'routeVariant.slow'] };
    const destinationWithVariants: Destination = { ...destination, routeIds: [routeWithVariants.id] };

    const express: RouteVariant = {
      id: 'routeVariant.express',
      title: 'Express',
      appliesWhen: { kind: 'factTruthy', fact: 'household.isUrgent' },
      priority: 10,
      stepIds: ['step.express-form'],
    };
    const slow: RouteVariant = {
      id: 'routeVariant.slow',
      title: 'Slow',
      appliesWhen: { kind: 'factTruthy', fact: 'household.isUrgent' },
      priority: 1,
      stepIds: ['step.slow-form'],
    };

    it('selects the highest-priority applicable variant over the route default', () => {
      const routes = index([routeWithVariants]);
      const variants = index([express, slow]);
      const result = selectRoute(destinationWithVariants, routes, variants, { 'household.isUrgent': true });
      expect(result.variant?.id).toBe('routeVariant.express');
      expect(result.stepIds).toEqual(['step.express-form']);
    });

    it('falls back to the route stepIds when no variant applies', () => {
      const routes = index([routeWithVariants]);
      const variants = index([express, slow]);
      const result = selectRoute(destinationWithVariants, routes, variants, { 'household.isUrgent': false });
      expect(result.variant).toBeUndefined();
      expect(result.stepIds).toEqual(routeWithVariants.stepIds);
    });

    it('reports a missing variant reference and still falls back to another applicable variant or the route', () => {
      const routes = index([{ ...routeWithVariants, variantIds: ['routeVariant.missing'] }]);
      const result = selectRoute(destinationWithVariants, routes, new Map(), {});
      expect(result.variant).toBeUndefined();
      expect(result.stepIds).toEqual(routeWithVariants.stepIds);
      expect(result.issues).toEqual([
        { kind: 'missingReference', entityKind: 'routeVariant', id: 'routeVariant.missing', referencedFrom: routeWithVariants.id },
      ]);
    });
  });

  it('does not mutate the destination, route, or variant inputs', () => {
    const routes = index([routeOnline, routeInPerson]);
    const destSnapshot = structuredClone(destination);
    const routesSnapshot = new Map(routes);
    selectRoute(destination, routes, new Map(), {});
    expect(destination).toEqual(destSnapshot);
    expect(routes).toEqual(routesSnapshot);
  });
});
