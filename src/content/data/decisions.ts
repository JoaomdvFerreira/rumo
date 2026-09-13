import type { DecisionReference } from '../../domain/model/decision';

/**
 * Representative decision references: the authoritative basis for rules
 * that gate or shape routing (never the rule logic itself -- that lives
 * only in the Condition AST, per domain/model/decision.ts).
 *
 * F1/F2/F3 remediation (Project Overseer review of WU004/C004) added the
 * Citizen Card auto-notification decision, corrected the energy-switching
 * timing decision to state the regulatory maximum (never a fabricated
 * "typical" duration), and added the two Évora water decisions the
 * representative requirements and 5-business-day wait step depend on.
 *
 * F4/F5/F6 remediation (second Project Overseer review of WU004/C004):
 * added the gov.pt evidence source to the Citizen Card decision without
 * weakening it; repointed the Évora water requirements decision at the
 * current (not superseded) municipal contract form; and corrected the
 * ANACOM portability decision's effective date and source (Regulation
 * 38/2025 entered into force 9, not 10, November 2025), dropping the
 * specific date from the operational summary since it adds no ongoing
 * value there.
 *
 * F7/F8 remediation (third Project Overseer review of WU004/C004):
 * corrected the ANACOM portability decision's CVP responsibility flow
 * (the outgoing/current provider generates and communicates the CVP; the
 * user supplies it to the receiving/new provider -- not the receiving
 * provider obtaining it directly from the outgoing one), and cited both
 * current Évora water municipal documents (contract form and process
 * sheet) on the individual-contract requirements decision rather than the
 * contract form alone.
 */
export const decisionReferences: DecisionReference[] = [
  {
    id: 'decision.citizen-card-address-change-notifies-at-ss-sns',
    sourceIds: [
      'source.gov-pt-mudar-de-casa',
      'source.autenticacao-gov-alteracao-morada',
    ],
    summary:
      'Changing the address on a Portuguese Citizen Card automatically communicates the new address to the Tax Authority (AT), Social Security, and the National Health Service (SNS); a separate fiscal-address change on Portal das Finanças is neither required nor correct for a Citizen Card holder.',
    citation:
      'gov.pt, "Mudar de casa"; Autenticação.gov.pt / IRN, "Alterar a morada do Cartão de Cidadão"',
  },
  {
    id: 'decision.energy-switch-is-free-and-supplier-led',
    sourceIds: ['source.erse-mudar-comercializador'],
    summary:
      'Switching electricity or gas supplier in Portugal is free, has no notice requirement to the outgoing supplier, is administratively handled by the new supplier once the customer signs up, supply must not be interrupted during the switch, and the change must be completed within a maximum of three weeks from the new contract -- this is a regulatory maximum, not a typical/expected duration.',
    citation: 'ERSE, "Contratar/mudar de comercializador"',
  },
  {
    id: 'decision.portability-is-free-with-cvp-code',
    sourceIds: [
      'source.anacom-regulamento-38-2025',
      'source.anacom-portabilidade',
    ],
    summary:
      'Under the current ANACOM portability rules, companies may not charge end users direct portability fees. The outgoing/current provider generates and communicates the CVP to the user, and the user supplies that CVP to the receiving/new provider as part of the portability request.',
    citation:
      'ANACOM, Regulamento n.º 38/2025; ANACOM, "Portabilidade de número"',
  },
  {
    id: 'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
    sourceIds: [
      'source.cm-evora-formulario-celebracao-contrato',
      'source.cm-evora-ficha-servico-celebracao-contrato',
    ],
    summary:
      'For an individual (non-corporate) water supply contract with Câmara Municipal de Évora, the user must provide valid identification, NIF / tax-identification information, and proof of legal right/legitimacy to occupy the property (ownership or tenancy documentation, varying by case).',
    citation:
      'Câmara Municipal de Évora, "Celebração de Contrato de Fornecimento": formulário (RE.ASAN.005V03, 2026-05-05) and ficha de serviço (FS.ASAN.005V01, 2023), secção "Documentos a Apresentar"',
  },
  {
    id: 'decision.evora-water-connection-max-five-business-days',
    sourceIds: ['source.cm-evora-regulamento-abastecimento-agua'],
    summary:
      'Under the Évora municipal water supply regulation, a water supply contract takes effect from the start of supply, which must occur within a maximum of five business days counted from the contract request, except in cases of force majeure. This is a regulatory maximum, not a typical/expected duration.',
    citation:
      'Regulamento do Serviço de Abastecimento Público de Água do Município de Évora, Artigo 56.º, n.º 1',
  },
];
