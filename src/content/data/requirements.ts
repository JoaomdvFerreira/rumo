import type {
  Requirement,
  RequirementGroup,
} from '../../domain/model/requirement';

/**
 * Representative requirements. The Évora water requirements below
 * participate in routing/blocking (via requirementGroup.evora-water-new-
 * contract on step.j01-evora-water-request-contract) and are
 * decision-bearing: F3 remediation (Project Overseer review of WU004/
 * C004) populated their `decisionReferenceIds` with the DecisionReference
 * that actually enumerates them from the authoritative municipal source,
 * per the content:check rule that a routing-participating Requirement
 * cannot silently lack provenance (see validate.ts,
 * checkDecisionBearingRequirementProvenance).
 */
export const requirements: Requirement[] = [
  {
    id: 'requirement.evora-water-identification-document',
    title: 'Valid identification document',
    description:
      'Citizen Card (Cartão de Cidadão), Bilhete de Identidade, Passaporte, or Autorização de Residência for the person requesting the contract.',
    decisionReferenceIds: [
      'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
    ],
  },
  {
    id: 'requirement.evora-water-property-proof',
    title: 'Proof of right to occupy the property',
    description:
      'Lease agreement, property deed, or equivalent document showing the applicant is entitled to occupy the address.',
    decisionReferenceIds: [
      'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
    ],
  },
  {
    id: 'requirement.evora-water-nif',
    title: 'Tax identification number (NIF)',
    description:
      'Portuguese tax identification number (Cartão de Contribuinte) for billing.',
    decisionReferenceIds: [
      'decision.evora-water-individual-contract-requires-id-nif-and-occupancy-proof',
    ],
  },
];

export const requirementGroups: RequirementGroup[] = [
  {
    id: 'requirementGroup.evora-water-new-contract',
    mode: 'allOf',
    requirementIds: [
      'requirement.evora-water-identification-document',
      'requirement.evora-water-property-proof',
      'requirement.evora-water-nif',
    ],
  },
];
