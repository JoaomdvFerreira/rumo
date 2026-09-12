import type { FactSet } from '../../domain/model/fact';

/**
 * Bounded, declarative fact-question catalog (WU007 scope): exactly the
 * three canonical facts named in the frozen WU007 spec, each mapped to one
 * explicit boolean question. This module invents no new canonical facts --
 * it only supplies UI copy for facts the domain/content layers already
 * define and consume (household.hasCitizenCard, household.hasGasConnection,
 * household.wantsToKeepPhoneNumber). A fact stays absent/unknown until the
 * user explicitly answers; this catalog never supplies a default value.
 */
export interface FactQuestion {
  readonly factKey: string;
  readonly prompt: string;
  readonly trueLabel: string;
  readonly falseLabel: string;
  /** Only ask this question when relevant to the destination currently being routed. */
  readonly relevantDestinationIds: readonly string[];
}

export const FACT_QUESTIONS: readonly FactQuestion[] = [
  {
    factKey: 'household.hasCitizenCard',
    prompt: 'Tem Cartão de Cidadão português?',
    trueLabel: 'Sim',
    falseLabel: 'Não',
    relevantDestinationIds: ['destination.j01-settle-new-address'],
  },
  {
    factKey: 'household.hasGasConnection',
    prompt: 'A nova casa já tem ligação de gás?',
    trueLabel: 'Sim',
    falseLabel: 'Não',
    relevantDestinationIds: ['destination.j02-energy-connected'],
  },
  {
    factKey: 'household.wantsToKeepPhoneNumber',
    prompt: 'Quer manter o seu número de telefone atual?',
    trueLabel: 'Sim',
    falseLabel: 'Não',
    relevantDestinationIds: ['destination.j03-internet-connected'],
  },
];

export function questionsForDestination(destinationId: string): readonly FactQuestion[] {
  return FACT_QUESTIONS.filter((question) => question.relevantDestinationIds.includes(destinationId));
}

/** A question is already answered when its fact is present in the FactSet, regardless of value. */
export function isFactKnown(facts: FactSet, factKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(facts, factKey);
}

export function nextUnansweredQuestion(
  destinationId: string,
  facts: FactSet,
): FactQuestion | undefined {
  return questionsForDestination(destinationId).find((question) => !isFactKnown(facts, question.factKey));
}
