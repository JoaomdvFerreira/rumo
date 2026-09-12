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

  /**
   * F4 remediation guard (second Project Overseer review of WU004/C004):
   * the Autenticação.gov action page alone was not the strongest evidence
   * for the auto-notification claim -- source.gov-pt-mudar-de-casa was
   * added as authoritative gov.pt evidence for it. Pinned so a future edit
   * cannot silently drop that evidence source while leaving the claim in
   * place.
   */
  it('cites the gov.pt "Mudar de casa" evidence source on the Citizen Card auto-notification decision', () => {
    const decision = canonicalContent.decisionReferences.find(
      (entry) =>
        entry.id === 'decision.citizen-card-address-change-notifies-at-ss-sns',
    );
    expect(decision?.sourceIds).toContain('source.gov-pt-mudar-de-casa');
    const evidenceSource = canonicalContent.sources.find(
      (source) => source.id === 'source.gov-pt-mudar-de-casa',
    );
    expect(evidenceSource?.url).toBe('https://www.gov.pt/guias/mudar-de-casa');
    expect(evidenceSource?.kind).toBe('evidence');
  });

  /**
   * F5 remediation guard: the 2018 CM Évora contract-information PDF is
   * superseded by the current (2026-05-05) contract form and its 2023
   * process/channel sheet. Pinned so canonical provenance cannot silently
   * fall back to the obsolete source set.
   */
  it('does not cite the superseded 2018 Évora water contract-information source', () => {
    const sourceIds = canonicalContent.sources.map((source) => source.id);
    expect(sourceIds).not.toContain(
      'source.cm-evora-informacao-contratacao-agua',
    );
    for (const source of canonicalContent.sources) {
      expect(source.url).not.toContain(
        'INFORMACAO_CONTRATACAO_AGUA_atualizada_marco_2018',
      );
    }
    expect(sourceIds).toContain(
      'source.cm-evora-formulario-celebracao-contrato',
    );
    expect(sourceIds).toContain(
      'source.cm-evora-ficha-servico-celebracao-contrato',
    );
  });

  /**
   * F6 remediation guard: ANACOM Regulation 38/2025 entered into force on
   * 9 November 2025, not 10 November. Pinned across both the decision and
   * every source's `caution` text so the incorrect date cannot silently
   * reappear anywhere in canonical content.
   */
  it('does not state the incorrect 10 November 2025 ANACOM portability effective date anywhere', () => {
    const decision = canonicalContent.decisionReferences.find(
      (entry) => entry.id === 'decision.portability-is-free-with-cvp-code',
    );
    expect(decision?.summary).not.toContain('10 November 2025');
    expect(decision?.citation).not.toContain('10 November 2025');
    for (const source of canonicalContent.sources) {
      expect(source.caution ?? '').not.toContain('10 November 2025');
    }
    const regulationSource = canonicalContent.sources.find(
      (source) => source.id === 'source.anacom-regulamento-38-2025',
    );
    expect(regulationSource?.url).toBe(
      'https://anacom.pt/render.jsp?contentId=1801193',
    );
  });

  /**
   * F7 remediation guard (third Project Overseer review of WU004/C004):
   * Regulation 38/2025 has the outgoing/current provider generate and
   * communicate the CVP to the user, who then supplies it to the
   * receiving/new provider -- not the receiving provider obtaining the
   * CVP directly from the outgoing provider. Pinned so that incorrect
   * flow direction cannot silently reappear.
   */
  it('does not state that the receiving provider obtains the CVP directly from the outgoing provider', () => {
    const decision = canonicalContent.decisionReferences.find(
      (entry) => entry.id === 'decision.portability-is-free-with-cvp-code',
    );
    expect(decision?.summary).not.toMatch(
      /receiving[^.]*obtain[^.]*from[^.]*outgoing/i,
    );
    expect(decision?.summary).toContain(
      'outgoing/current provider generates and communicates the CVP',
    );
    expect(decision?.summary).toContain(
      'user supplies that CVP to the receiving/new provider',
    );
  });

  /**
   * F8 remediation guard (third Project Overseer review of WU004/C004):
   * the Évora individual-contract requirements decision must cite both
   * current municipal documents (the contract form and its process/
   * channel sheet) rather than the contract form alone, since its summary
   * draws on facts confirmed across both.
   */
  it('cites both current Évora municipal documents on the individual-contract requirements decision', () => {
    const decision = canonicalContent.decisionReferences.find(
      (entry) =>
        entry.id ===
        'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
    );
    expect(decision?.sourceIds).toContain(
      'source.cm-evora-formulario-celebracao-contrato',
    );
    expect(decision?.sourceIds).toContain(
      'source.cm-evora-ficha-servico-celebracao-contrato',
    );
  });
});
