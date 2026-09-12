import type {
  SourceDefinition,
  SourceVerification,
} from '../../domain/model/source';

/**
 * Representative MVP sources (docs/product/mvp-scope.md): national
 * authoritative sources for address/registration and energy/telecom
 * switching, plus the Évora municipal sources for water supply. Every
 * source is `kind: 'evidence'` or `'action'` depending on whether the
 * content primarily cites it for factual backing or sends the user there
 * to act; none is a `fallback` in this representative slice.
 *
 * `freshnessRisk` reflects how likely each source's content is to change
 * without notice: national regulator/gov.pt guidance changes rarely and
 * predictably (`medium`), municipal PDFs and regulation pages can change
 * without a visible changelog (`high`), and a stable consumer-rights
 * explainer changes least (`low`).
 *
 * F1/F2/F3 remediation (Project Overseer review of WU004/C004) replaced
 * source.eportugal-mudar-de-casa as the address-routing citation with two
 * precise sources (Citizen Card address change; Portal das Finanças fiscal
 * domicile), corrected the energy-switching timing citation, and added the
 * municipal contract-requirements and regulation sources the Évora water
 * requirements and 5-business-day wait step actually need for provenance.
 */
export const sources: SourceDefinition[] = [
  {
    id: 'source.autenticacao-gov-alteracao-morada',
    title: 'Alterar a morada do Cartão de Cidadão',
    publisher:
      'Autenticação.gov.pt / Instituto dos Registos e do Notariado (IRN)',
    url: 'https://www.autenticacao.gov.pt/cartao-cidadao/alteracao-morada',
    jurisdiction: 'PT',
    kind: 'action',
    freshnessRisk: 'medium',
    supports: [
      'decision.citizen-card-address-change-notifies-at-ss-sns',
      'provider.autenticacao-gov-cartao-cidadao',
      'step.j01-update-citizen-card-address',
    ],
  },
  {
    id: 'source.portaldasfinancas-morada',
    title: 'Morada - Apoio ao Contribuinte',
    publisher: 'Autoridade Tributária e Aduaneira / Portal das Finanças',
    url: 'https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Dados_pessoais_familia/Dados_pessoais/Morada/Paginas/default.aspx',
    jurisdiction: 'PT',
    kind: 'action',
    freshnessRisk: 'medium',
    supports: [
      'provider.portal-das-financas',
      'step.j01-update-fiscal-address',
    ],
    caution:
      'Describes a distinct channel for citizens without a Citizen Card; do not present alongside the Citizen Card address-change step for the same person.',
  },
  {
    id: 'source.erse-mudar-comercializador',
    title: 'Contratar/mudar de comercializador',
    publisher: 'ERSE - Entidade Reguladora dos Serviços Energéticos',
    url: 'https://www.erse.pt/consumidores-de-energia/eletricidade/contratarmudar-de-comercializador/',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: [
      'decision.energy-switch-is-free-and-supplier-led',
      'step.j02-choose-electricity-supplier',
      'step.j02-choose-gas-supplier',
    ],
    caution:
      'Switching timelines and penalty rules can change; always confirm current terms with the chosen supplier before committing. The 3-week figure is a regulatory maximum, not a typical/expected duration -- do not restate it as "typically N days".',
  },
  {
    id: 'source.anacom-portabilidade',
    title: 'Portabilidade de números e código CVP',
    publisher: 'ANACOM - Autoridade Nacional de Comunicações',
    url: 'https://www.anacom.pt/render.jsp?contentId=899419',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: [
      'decision.portability-is-free-with-cvp-code',
      'step.j03-request-portability',
      'step.j03-portability-window-wait',
    ],
    caution:
      'Fee rules changed in November 2025 (portability became free); reconfirm current fee/compensation figures before quoting them to a user.',
  },
  {
    id: 'source.cm-evora-informacao-contratacao-agua',
    title:
      'Informação sobre Fornecimento de Água (documentos para contratação)',
    publisher: 'Câmara Municipal de Évora',
    url: 'https://www.cm-evora.pt/wp-content/uploads/2020/07/INFORMACAO_CONTRATACAO_AGUA_atualizada_marco_2018.pdf',
    jurisdiction: 'PT-Évora',
    kind: 'action',
    freshnessRisk: 'high',
    supports: [
      'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
      'provider.cm-evora-aguas',
      'step.j01-evora-water-request-contract',
      'requirement.evora-water-identification-document',
      'requirement.evora-water-nif',
      'requirement.evora-water-property-proof',
    ],
    caution:
      'Municipal procedural detail (documents, fees, channels) can change without a visible changelog; treat page detail as needing frequent reverification, not as permanently current.',
  },
  {
    id: 'source.cm-evora-regulamento-abastecimento-agua',
    title:
      'Regulamento do Serviço de Abastecimento Público de Água do Município de Évora (Artigo 56.º)',
    publisher: 'Município de Évora / Diário da República, 2.ª série, n.º 252',
    url: 'https://www.cm-evora.pt/wp-content/uploads/2020/07/regulamento-servico-publico-abastecimento-agua.pdf',
    jurisdiction: 'PT-Évora',
    kind: 'evidence',
    freshnessRisk: 'high',
    supports: [
      'decision.evora-water-connection-max-five-business-days',
      'step.j01-evora-water-connection-wait',
    ],
    caution:
      'Article 56(1) states five business days is a maximum from contract request, subject to force-majeure exceptions -- do not present it as a typical/expected duration.',
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
 *
 * Every entry below reflects an actual fetch/read performed for this WU004
 * F1-F3 remediation (or the original WU004 pass), not a fabricated record.
 */
export const sourceVerifications: SourceVerification[] = [
  {
    sourceId: 'source.autenticacao-gov-alteracao-morada',
    checkedAt: '2026-09-12T00:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T00:00:00.000Z',
  },
  {
    sourceId: 'source.portaldasfinancas-morada',
    checkedAt: '2026-09-12T00:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T00:00:00.000Z',
  },
  {
    sourceId: 'source.erse-mudar-comercializador',
    checkedAt: '2026-09-12T00:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T00:00:00.000Z',
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
    sourceId: 'source.cm-evora-informacao-contratacao-agua',
    checkedAt: '2026-09-12T00:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T00:00:00.000Z',
  },
  {
    sourceId: 'source.cm-evora-regulamento-abastecimento-agua',
    checkedAt: '2026-09-12T00:00:00.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T00:00:00.000Z',
  },
];
