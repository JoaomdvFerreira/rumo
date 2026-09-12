import type { DecisionReference } from '../../domain/model/decision';

/**
 * Representative decision references: the authoritative basis for rules
 * that gate or shape routing (never the rule logic itself -- that lives
 * only in the Condition AST, per domain/model/decision.ts).
 */
export const decisionReferences: DecisionReference[] = [
  {
    id: 'decision.energy-switch-is-free-and-supplier-led',
    sourceIds: ['source.erse-mudar-comercializador'],
    summary:
      'Switching electricity or gas supplier in Portugal is free, has no notice requirement to the outgoing supplier, and is administratively handled by the new supplier once the customer signs up.',
    citation: 'ERSE, "Mudar de comercializador de eletricidade ou de gás"',
  },
  {
    id: 'decision.portability-is-free-with-cvp-code',
    sourceIds: ['source.anacom-portabilidade'],
    summary:
      'Since 10 November 2025, number portability between telecom operators in Portugal is free of charge and requires the 12-digit CVP (Código de Validação da Portabilidade) code from the outgoing operator.',
    citation: 'ANACOM, "Portabilidade de número"',
  },
];
