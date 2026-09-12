import { describe, expect, it } from 'vitest';

import { canonicalContent } from './index';
import { resolveDestination } from '../domain/engine/destination';
import type { DestinationGraph } from '../domain/engine/destination';
import type { RoutingContext } from '../domain/engine/runtime';

/**
 * Proves the content architecture (WU004's objective): the representative
 * canonical content, unmodified, resolves correctly through the real
 * WU003 routing engine -- not just against `content:check`'s structural
 * rules. This is the closest thing to an end-to-end check available
 * without UI/persistence, which are out of WU004's scope.
 */
function index<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function graph(): DestinationGraph {
  return {
    destinations: index(canonicalContent.destinations),
    routes: index(canonicalContent.routes),
    routeVariants: index(canonicalContent.routeVariants),
    steps: index(canonicalContent.steps),
    requirements: index(canonicalContent.requirements),
    requirementGroups: index(canonicalContent.requirementGroups),
  };
}

function context(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    facts: {},
    progress: {
      manualCompletedStepIds: new Set(),
      externalOutcomeCompletedStepIds: new Set(),
      satisfiedRequirementIds: new Set(),
    },
    ...overrides,
  };
}

describe('representative content resolves through the routing engine', () => {
  it('resolves J01 settle-new-address with no unresolved references, outside Évora', () => {
    const resolution = resolveDestination('destination.j01-settle-new-address', graph(), context());
    expect(resolution.issues).toEqual([]);
    expect(resolution.state).toBe('actionable');
    expect(resolution.primaryAction?.step.id).toBe('step.j01-update-citizen-card-address');
  });

  it('surfaces the Évora water subjourney as parallel work once its requirements are satisfied', () => {
    const resolution = resolveDestination(
      'destination.j01-settle-new-address',
      graph(),
      context({
        facts: { 'household.municipality': 'evora' },
        progress: {
          manualCompletedStepIds: new Set(),
          externalOutcomeCompletedStepIds: new Set(),
          satisfiedRequirementIds: new Set([
            'requirement.evora-water-identification-document',
            'requirement.evora-water-property-proof',
            'requirement.evora-water-nif',
          ]),
        },
      }),
    );
    expect(resolution.issues).toEqual([]);
    expect(resolution.state).toBe('actionable');
    const allActionIds = [resolution.primaryAction, ...resolution.parallelActions]
      .filter((entry) => entry !== undefined)
      .map((entry) => entry.step.id);
    expect(allActionIds).toContain('step.j01-evora-water-request-contract');
  });

  it('does not surface the blocked Évora water subjourney until its requirements are satisfied', () => {
    const resolution = resolveDestination(
      'destination.j01-settle-new-address',
      graph(),
      context({ facts: { 'household.municipality': 'evora' } }),
    );
    expect(resolution.issues).toEqual([]);
    const allActionIds = [resolution.primaryAction, ...resolution.parallelActions]
      .filter((entry) => entry !== undefined)
      .map((entry) => entry.step.id);
    expect(allActionIds).not.toContain('step.j01-evora-water-request-contract');
  });

  it('does not surface the Évora water subjourney outside Évora', () => {
    const resolution = resolveDestination(
      'destination.j01-settle-new-address',
      graph(),
      context({ facts: { 'household.municipality': 'lisboa' } }),
    );
    const allActionIds = [resolution.primaryAction, ...resolution.parallelActions]
      .filter((entry) => entry !== undefined)
      .map((entry) => entry.step.id);
    expect(allActionIds).not.toContain('step.j01-evora-water-request-contract');
  });

  it('resolves the Évora water destination directly and blocks on its requirement group until satisfied', () => {
    const blocked = resolveDestination('destination.j01-evora-water-connection', graph(), context());
    expect(blocked.issues).toEqual([]);
    expect(blocked.state).toBe('blocked');

    const satisfied = resolveDestination(
      'destination.j01-evora-water-connection',
      graph(),
      context({
        progress: {
          manualCompletedStepIds: new Set(),
          externalOutcomeCompletedStepIds: new Set(),
          satisfiedRequirementIds: new Set([
            'requirement.evora-water-identification-document',
            'requirement.evora-water-property-proof',
            'requirement.evora-water-nif',
          ]),
        },
      }),
    );
    expect(satisfied.issues).toEqual([]);
    expect(satisfied.state).toBe('actionable');
    expect(satisfied.primaryAction?.step.id).toBe('step.j01-evora-water-request-contract');
  });

  it('resolves J02 electricity/gas, gating the gas steps on household.hasGasConnection', () => {
    const withoutGas = resolveDestination('destination.j02-energy-connected', graph(), context());
    expect(withoutGas.issues).toEqual([]);
    expect(withoutGas.primaryAction?.step.id).toBe('step.j02-choose-electricity-supplier');
    const withoutGasAllIds = [withoutGas.primaryAction, ...withoutGas.parallelActions]
      .filter((entry) => entry !== undefined)
      .map((entry) => entry.step.id);
    expect(withoutGasAllIds).not.toContain('step.j02-choose-gas-supplier');

    const withGas = resolveDestination(
      'destination.j02-energy-connected',
      graph(),
      context({ facts: { 'household.hasGasConnection': true } }),
    );
    expect(withGas.issues).toEqual([]);
    const withGasAllIds = [withGas.primaryAction, ...withGas.parallelActions]
      .filter((entry) => entry !== undefined)
      .map((entry) => entry.step.id);
    expect(withGasAllIds).toContain('step.j02-choose-gas-supplier');
  });

  it('resolves J03 internet with the default new-installation route when portability is not requested', () => {
    const resolution = resolveDestination('destination.j03-internet-connected', graph(), context());
    expect(resolution.issues).toEqual([]);
    expect(resolution.primaryAction?.step.id).toBe('step.j03-choose-internet-operator');
  });

  it('resolves J03 internet with the portability RouteVariant when the household wants to keep its number', () => {
    const resolution = resolveDestination(
      'destination.j03-internet-connected',
      graph(),
      context({ facts: { 'household.wantsToKeepPhoneNumber': true } }),
    );
    expect(resolution.issues).toEqual([]);
    expect(resolution.primaryAction?.step.id).toBe('step.j03-request-portability');
  });

  it('resolves every declared destination without resolver issues in the default (empty facts) context', () => {
    for (const destination of canonicalContent.destinations) {
      const resolution = resolveDestination(destination.id, graph(), context());
      expect(resolution.issues, `destination ${destination.id} should resolve without issues`).toEqual([]);
    }
  });
});
