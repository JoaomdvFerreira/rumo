import { describe, expect, it } from 'vitest';

import { destinationSchema, lifeEventSchema, routeSchema, routeVariantSchema } from './routing';

describe('lifeEventSchema', () => {
  it('accepts a life event with at least one destination', () => {
    const result = lifeEventSchema.safeParse({
      id: 'lifeEvent.moving-home',
      title: 'Moving home',
      description: 'Moving home or setting up a new home in Portugal.',
      destinationIds: ['destination.register-new-address'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a life event with an empty destinationIds array', () => {
    const result = lifeEventSchema.safeParse({
      id: 'lifeEvent.moving-home',
      title: 'Moving home',
      description: 'Moving home or setting up a new home in Portugal.',
      destinationIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a life event with an unexpected extra key', () => {
    const result = lifeEventSchema.safeParse({
      id: 'lifeEvent.moving-home',
      title: 'Moving home',
      description: 'Moving home or setting up a new home in Portugal.',
      destinationIds: ['destination.register-new-address'],
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });
});

describe('destinationSchema', () => {
  it('accepts a destination with at least one route', () => {
    const result = destinationSchema.safeParse({
      id: 'destination.register-new-address',
      title: 'Register your new address',
      description: 'Register the new address with the municipality.',
      routeIds: ['route.register-address-online'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a destination with an empty routeIds array', () => {
    const result = destinationSchema.safeParse({
      id: 'destination.register-new-address',
      title: 'Register your new address',
      description: 'Register the new address with the municipality.',
      routeIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a destination with an unexpected extra key', () => {
    const result = destinationSchema.safeParse({
      id: 'destination.register-new-address',
      title: 'Register your new address',
      description: 'Register the new address with the municipality.',
      routeIds: ['route.register-address-online'],
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });
});

describe('routeSchema', () => {
  it('accepts a minimal route and applies deterministic defaults', () => {
    const result = routeSchema.safeParse({
      id: 'route.register-address-online',
      title: 'Register online',
      stepIds: ['step.submit-online-form'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(0);
      expect(result.data.variantIds).toEqual([]);
    }
  });

  it('accepts a route with an explicit condition, priority, and variants', () => {
    const result = routeSchema.safeParse({
      id: 'route.register-address-online',
      title: 'Register online',
      appliesWhen: { kind: 'factTruthy', fact: 'household.hasOnlineAccess' },
      priority: 10,
      stepIds: ['step.submit-online-form'],
      variantIds: ['routeVariant.express'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a route with a negative priority', () => {
    const result = routeSchema.safeParse({
      id: 'route.register-address-online',
      title: 'Register online',
      priority: -1,
      stepIds: ['step.submit-online-form'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a route with an empty stepIds array', () => {
    const result = routeSchema.safeParse({
      id: 'route.register-address-online',
      title: 'Register online',
      stepIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a route with an unexpected extra key', () => {
    const result = routeSchema.safeParse({
      id: 'route.register-address-online',
      title: 'Register online',
      stepIds: ['step.submit-online-form'],
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });
});

describe('routeVariantSchema', () => {
  it('accepts a valid route variant with a condition', () => {
    const result = routeVariantSchema.safeParse({
      id: 'routeVariant.express',
      title: 'Express variant',
      appliesWhen: { kind: 'factTruthy', fact: 'household.isUrgent' },
      priority: 5,
      stepIds: ['step.submit-online-form-express'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(5);
    }
  });

  it('applies a deterministic default priority', () => {
    const result = routeVariantSchema.safeParse({
      id: 'routeVariant.express',
      title: 'Express variant',
      appliesWhen: { kind: 'factTruthy', fact: 'household.isUrgent' },
      stepIds: ['step.submit-online-form-express'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(0);
    }
  });

  it('rejects a route variant missing appliesWhen', () => {
    const result = routeVariantSchema.safeParse({
      id: 'routeVariant.express',
      title: 'Express variant',
      stepIds: ['step.submit-online-form-express'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a route variant with an empty stepIds array', () => {
    const result = routeVariantSchema.safeParse({
      id: 'routeVariant.express',
      title: 'Express variant',
      appliesWhen: { kind: 'factTruthy', fact: 'household.isUrgent' },
      stepIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a route variant with an unexpected extra key', () => {
    const result = routeVariantSchema.safeParse({
      id: 'routeVariant.express',
      title: 'Express variant',
      appliesWhen: { kind: 'factTruthy', fact: 'household.isUrgent' },
      stepIds: ['step.submit-online-form-express'],
      extra: 'not allowed',
    });
    expect(result.success).toBe(false);
  });
});
