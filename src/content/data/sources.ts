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
 *
 * F4/F5/F6 remediation (second Project Overseer review of WU004/C004):
 * added a gov.pt evidence source for the Citizen Card auto-notification
 * claim (the Autenticação.gov action page alone was not the strongest
 * evidence for that specific claim); replaced the superseded 2018 Évora
 * water contract-information PDF with the current (2026-05-05) contract
 * form and its 2023 process/channel sheet; and repointed the ANACOM
 * portability source at Regulation 38/2025 itself, correcting the
 * effective date (9, not 10, November 2025).
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
      'provider.autenticacao-gov-cartao-cidadao',
      'step.j01-update-citizen-card-address',
    ],
    caution:
      'Authoritative for the address-change action/channel itself; use source.gov-pt-mudar-de-casa as the evidence citation for the automatic-notification claim (F4 remediation).',
  },
  {
    id: 'source.gov-pt-mudar-de-casa',
    title: 'Mudar de casa',
    publisher: 'gov.pt',
    url: 'https://www.gov.pt/guias/mudar-de-casa',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: ['decision.citizen-card-address-change-notifies-at-ss-sns'],
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
      'step.j03-request-portability',
      'step.j03-portability-window-wait',
    ],
    caution:
      'Explainer page for the one-business-day/three-hour-window operational detail; see source.anacom-regulamento-38-2025 for the authoritative no-direct-charges/CVP-required rule itself.',
  },
  {
    id: 'source.anacom-regulamento-38-2025',
    title: 'Regulamento n.º 38/2025 (portabilidade)',
    publisher: 'ANACOM - Autoridade Nacional de Comunicações',
    url: 'https://anacom.pt/render.jsp?contentId=1801193',
    jurisdiction: 'PT',
    kind: 'evidence',
    freshnessRisk: 'medium',
    supports: ['decision.portability-is-free-with-cvp-code'],
    caution:
      'Regulation 38/2025 entered into force on 9 November 2025 (10 months after its 9 January 2025 publication) -- not 10 November.',
  },
  {
    id: 'source.cm-evora-formulario-celebracao-contrato',
    title:
      'Celebração de Contrato de Fornecimento -- Formulário (RE.ASAN.005V03, 2026-05-05)',
    publisher: 'Câmara Municipal de Évora',
    url: 'https://formularios.cm-evora.pt/BalcaoOnline/DocsProcessos/PDF/_new/Agua_e_Saneamento/celebracao_contrato/RE.ASAN.005V03_Celeb_Contr_Forn_20260505.pdf',
    jurisdiction: 'PT-Évora',
    kind: 'action',
    freshnessRisk: 'high',
    supports: [
      'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
      'step.j01-evora-water-request-contract',
      'requirement.evora-water-identification-document',
      'requirement.evora-water-nif',
      'requirement.evora-water-property-proof',
    ],
    caution:
      'The current (2026-05-05, version V03) contract-request form itself: documents-to-present list confirmed unchanged from the prior version for individual contracting. Municipal procedural detail can change without a visible changelog; treat as needing frequent reverification.',
  },
  {
    id: 'source.cm-evora-ficha-servico-celebracao-contrato',
    title:
      'Celebração de Contrato de Fornecimento -- Ficha de Serviço (FS.ASAN.005V01, 2023)',
    publisher: 'Câmara Municipal de Évora',
    url: 'https://formularios.cm-evora.pt/BalcaoOnline/DocsProcessos/PDF/Agua%20e%20Saneamento/Celebra%C3%A7%C3%A3o%20de%20Contrato%20de%20Fornecimento/P0352-CIMAC-PMA_F2_Mod_FS_Celeb_Contr_Forn_V01_20230118.pdf',
    jurisdiction: 'PT-Évora',
    kind: 'action',
    freshnessRisk: 'high',
    supports: ['provider.cm-evora-aguas'],
    caution:
      'Process/channel sheet accompanying the current contract form: confirms Presencial, Correio Postal, Fax, Serviços Online, Correio Eletrónico, and Telefone (where legally applicable) as interaction channels. Municipal procedural detail can change without a visible changelog; treat as needing frequent reverification.',
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
 * remediation pass (F1-F3, or this F4-F6 pass), not a fabricated record --
 * `checkedAt`/`contentReviewedAt` are the true time the review happened,
 * not a synthetic midnight stamp standing in for "that day" (F5 remediation
 * note: earlier midnight timestamps in this file predate that correction
 * and were left as originally recorded rather than backfilled with a new
 * fabricated time).
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
    sourceId: 'source.gov-pt-mudar-de-casa',
    checkedAt: '2026-09-12T08:22:19.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T08:22:19.000Z',
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
    sourceId: 'source.anacom-regulamento-38-2025',
    checkedAt: '2026-09-12T08:22:19.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T08:22:19.000Z',
  },
  {
    sourceId: 'source.cm-evora-formulario-celebracao-contrato',
    checkedAt: '2026-09-12T08:22:19.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T08:22:19.000Z',
  },
  {
    sourceId: 'source.cm-evora-ficha-servico-celebracao-contrato',
    checkedAt: '2026-09-12T08:22:19.000Z',
    checkedBy: 'content-team',
    linkHealth: 'ok',
    contentFreshness: 'current',
    httpStatus: 200,
    contentReviewedAt: '2026-09-12T08:22:19.000Z',
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
