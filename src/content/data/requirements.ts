import type { Requirement, RequirementGroup } from '../../domain/model/requirement';

/**
 * Representative requirements. `decisionReferenceIds` is left empty where
 * a requirement is a routine documentary prerequisite rather than a rule
 * whose existence needs authoritative justification -- the schema does
 * not mandate provenance on every Requirement, only DecisionReference
 * itself is provenance-bearing (see domain/model/decision.ts).
 */
export const requirements: Requirement[] = [
  {
    id: 'requirement.evora-water-identification-document',
    title: 'Valid identification document',
    description: 'Citizen Card (Cartão de Cidadão) or other valid photo ID for the person requesting the contract.',
    decisionReferenceIds: [],
  },
  {
    id: 'requirement.evora-water-property-proof',
    title: 'Proof of right to occupy the property',
    description: 'Lease agreement, property deed, or equivalent document showing the applicant is entitled to occupy the address.',
    decisionReferenceIds: [],
  },
  {
    id: 'requirement.evora-water-nif',
    title: 'Tax identification number (NIF)',
    description: 'Portuguese tax identification number for billing.',
    decisionReferenceIds: [],
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
