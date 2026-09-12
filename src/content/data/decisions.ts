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
 */
export const decisionReferences: DecisionReference[] = [
  {
    id: 'decision.citizen-card-address-change-notifies-at-ss-sns',
    sourceIds: ['source.autenticacao-gov-alteracao-morada'],
    summary:
      'Changing the address on a Portuguese Citizen Card automatically communicates the new address to the Tax Authority (AT), Social Security, and the National Health Service (SNS); a separate fiscal-address change on Portal das Finanças is neither required nor correct for a Citizen Card holder.',
    citation:
      'Autenticação.gov.pt / IRN, "Alterar a morada do Cartão de Cidadão"',
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
    sourceIds: ['source.anacom-portabilidade'],
    summary:
      'Since 10 November 2025, number portability between telecom operators in Portugal is free of charge and requires the 12-digit CVP (Código de Validação da Portabilidade) code from the outgoing operator.',
    citation: 'ANACOM, "Portabilidade de número"',
  },
  {
    id: 'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
    sourceIds: ['source.cm-evora-informacao-contratacao-agua'],
    summary:
      'For an individual (non-corporate) water supply contract with Câmara Municipal de Évora, the user must present a valid identification document (Cartão de Cidadão, Bilhete de Identidade, Passaporte, or Autorização de Residência), a Cartão de Contribuinte (tax identification), and proof of a valid title to occupy the property (ownership or tenancy documentation, varying by case).',
    citation:
      'Câmara Municipal de Évora, "Informação sobre Fornecimento de Água", secção 1 (Contratação)',
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
