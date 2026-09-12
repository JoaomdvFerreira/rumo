import { describe, expect, it } from 'vitest';

import { canonicalContent, contentHash } from './index';
import { computeContentHash } from './hash';
import { checkContentGraph } from './validate';

/**
 * `pnpm content:check`: fails the moment the representative canonical
 * content graph has a duplicate id, dangling reference, invalid condition,
 * missing source verification, or an unresolved stale high-freshness-risk
 * source. Run via Vitest (see package.json) rather than a standalone
 * script, since the project has no ts-node/tsx runner and this reuses
 * existing, already-approved tooling instead of adding one.
 */
describe('content:check', () => {
  it('representative content validates with no cross-reference, condition, or freshness issues', () => {
    const issues = checkContentGraph(canonicalContent);
    expect(issues).toEqual([]);
  });

  it('content hash is deterministic across repeated computation', () => {
    expect(computeContentHash(canonicalContent)).toBe(contentHash);
    expect(computeContentHash(canonicalContent)).toBe(
      computeContentHash(canonicalContent),
    );
  });

  it('content hash is deterministic regardless of object key order', () => {
    const reordered = {
      ...canonicalContent,
      sources: canonicalContent.sources.map((source) => {
        const entries = Object.entries(source).reverse();
        return Object.fromEntries(entries) as typeof source;
      }),
    };
    expect(computeContentHash(reordered)).toBe(contentHash);
  });

  /**
   * F2 remediation guard (Project Overseer review of WU004/C004): ERSE
   * never describes energy-switching duration as "typical" -- only as a
   * regulatory maximum of three weeks, with supply never interrupted. This
   * pins that language so the fabricated "typically five business days"
   * claim cannot silently reappear in canonical content.
   */
  it('does not describe energy-switching duration as "typical" anywhere in canonical content', () => {
    const energySwitchSteps = canonicalContent.steps.filter(
      (step) =>
        step.id === 'step.j02-electricity-switch-wait' ||
        step.id === 'step.j02-gas-switch-wait',
    );
    expect(energySwitchSteps).toHaveLength(2);
    for (const step of energySwitchSteps) {
      expect(step.description.toLowerCase()).not.toContain('typically');
      if (step.kind === 'wait') {
        expect(step.estimatedDurationDays).toBeUndefined();
      }
    }
  });

  /**
   * F1 remediation guard: the Citizen Card address step and the direct
   * fiscal-address step must never share a provider -- that conflation is
   * exactly what F1 corrected. Pinned here at the content level (in
   * addition to the engine-level proof in integration.test.ts) so a future
   * content edit cannot silently reintroduce it.
   */
  it('does not associate the Citizen Card address step with the Portal das Finanças provider', () => {
    const citizenCardStep = canonicalContent.steps.find(
      (step) => step.id === 'step.j01-update-citizen-card-address',
    );
    const fiscalAddressStep = canonicalContent.steps.find(
      (step) => step.id === 'step.j01-update-fiscal-address',
    );
    expect(citizenCardStep?.kind).toBe('task');
    expect(fiscalAddressStep?.kind).toBe('task');
    if (
      citizenCardStep?.kind === 'task' &&
      fiscalAddressStep?.kind === 'task'
    ) {
      expect(citizenCardStep.providerId).not.toBe(
        'provider.portal-das-financas',
      );
      expect(citizenCardStep.providerId).toBe(
        'provider.autenticacao-gov-cartao-cidadao',
      );
      expect(fiscalAddressStep.providerId).toBe('provider.portal-das-financas');
    }
  });

  it('gates the two J01 address Routes on mutually exclusive household.hasCitizenCard values', () => {
    const addressDestination = canonicalContent.destinations.find(
      (destination) => destination.id === 'destination.j01-settle-new-address',
    );
    expect(addressDestination?.routeIds).toHaveLength(2);
    const addressRoutes = canonicalContent.routes.filter((route) =>
      addressDestination?.routeIds.includes(route.id),
    );
    expect(addressRoutes).toHaveLength(2);
    const conditions = addressRoutes.map((route) => route.appliesWhen);
    expect(conditions).toContainEqual({
      kind: 'factEquals',
      fact: 'household.hasCitizenCard',
      value: true,
    });
    expect(conditions).toContainEqual({
      kind: 'factEquals',
      fact: 'household.hasCitizenCard',
      value: false,
    });
  });
});
