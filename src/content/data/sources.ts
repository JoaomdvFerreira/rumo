import type { SourceDefinition, SourceVerification } from '../../domain/model/source';

/**
 * Representative MVP sources (docs/product/mvp-scope.md): national
 * authoritative sources for address/registration and energy/telecom
 * switching, plus the Évora municipal source for water supply. Every
 * source is `kind: 'evidence'` or `'action'` depending on whether the
 * content primarily cites it for factual backing or sends the user there
 * to act; none is a `fallback` in this representative slice.
 *
 * `freshnessRisk` reflects how likely each source's content is to change
 * without notice: national regulator guidance changes rarely and
 * predictably (`medium`), fee/schedule detail on a single municipality
 * page can change without a visible changelog (`high`), and a stable
 * consumer-rights explainer changes least (`low`).
 */
export const sources: SourceDefinition[] = [
  {
    id: 'source.eportugal-mudar-de-casa',
    title: 'Mudar de casa',
    publisher: 'gov.pt / ePortugal',
    url: 'https://www.gov.pt/guias/mudar-de-casa',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: ['step.j01-update-fiscal-address', 'step.j01-update-citizen-card-address'],
  },
  {
    id: 'source.erse-mudar-comercializador',
    title: 'Mudar de comercializador de eletricidade ou de gás',
    publisher: 'ERSE - Entidade Reguladora dos Serviços Energéticos',
    url: 'https://www.erse.pt/eletricidade/mudar-de-comercializador/',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: [
      'decision.energy-switch-is-free-and-supplier-led',
      'step.j02-choose-electricity-supplier',
      'step.j02-choose-gas-supplier',
    ],
    caution: 'Switching timelines and penalty rules can change; always confirm current terms with the chosen supplier before committing.',
  },
  {
    id: 'source.anacom-portabilidade',
    title: 'Portabilidade de números e código CVP',
    publisher: 'ANACOM - Autoridade Nacional de Comunicações',
    url: 'https://www.anacom.pt/render.jsp?contentId=899419',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: ['decision.portability-is-free-with-cvp-code', 'step.j03-request-portability'],
    caution: 'Fee rules changed in November 2025 (portability became free); reconfirm current fee/compensation figures before quoting them to a user.',
  },
  {
    id: 'source.cm-evora-aguas-contratos',
    title: 'Águas - Contratos e Informações Gerais',
    publisher: 'Câmara Municipal de Évora',
    url: 'https://www.cm-evora.pt/en/municipe/areas-de-acao/aguas/contratos-e-informacoes-gerais/',
    jurisdiction: 'PT-Évora',
    kind: 'action',
    freshnessRisk: 'high',
    supports: [
      'provider.cm-evora-aguas',
      'step.j01-evora-water-request-contract',
      'requirement.evora-water-identification-document',
      'requirement.evora-water-property-proof',
    ],
    caution: 'Municipal procedural detail (documents, fees, channels) can change without a visible changelog; treat page detail as needing frequent reverification, not as permanently current.',
  },
];

/**
 * Representative SourceVerification history. Kept intentionally separate
 * from SourceDefinition (docs/architecture/guardrails.md): these are
 * point-in-time observations, not part of the source's identity. Link
 * health and content freshness are recorded as independent dimensions --
 * a source can be perfectly reachable (`linkHealth: 'ok'`) while its
 * content is stale; `content:check` (validate.ts) rejects that state for
 * any `high` freshnessRisk source, which is exercised directly against a
 * synthetic fixture in validate.test.ts rather than by letting this
 * representative package fail its own acceptance ("representative content
 * validates").
 */
export const sourceVerifications: SourceVerification[] = [
  {
    sourceId: 'source.eportugal-mudar-de-casa',
    checkedAt: '2026-09-01T09:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-01T09:00:00.000Z',
  },
  {
    sourceId: 'source.erse-mudar-comercializador',
    checkedAt: '2026-08-15T09:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-08-15T09:00:00.000Z',
  },
  {
    sourceId: 'source.anacom-portabilidade',
    checkedAt: '2026-09-05T09:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-05T09:00:00.000Z',
  },
  {
    sourceId: 'source.cm-evora-aguas-contratos',
    checkedAt: '2026-09-08T09:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-08T09:00:00.000Z',
  },
];
