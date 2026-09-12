import {
  intentCatalogSchema,
  type IntentCatalog,
} from '../domain/model/intent';
import type { Destination } from '../domain/model/routing';

const declaredIntentCatalog = [
  {
    id: 'intent.j01-moving-home',
    destinationId: 'destination.j01-settle-new-address',
    aliases: [
      {
        id: 'alias.j01-canonical-title',
        phrase: 'Settle into your new address',
        kind: 'intent',
      },
      {
        id: 'alias.j01-moving-home',
        phrase: 'moving home',
        kind: 'alias',
      },
      {
        id: 'alias.j01-new-home',
        phrase: 'settling into a new home',
        kind: 'alias',
      },
      {
        id: 'alias.j01-evora-rental',
        phrase: 'Entrei numa casa arrendada em Évora',
        kind: 'alias',
        extractedFacts: { 'household.municipality': 'evora' },
      },
      {
        id: 'alias.j01-launch-label',
        phrase: 'Mudar de casa',
        kind: 'alias',
      },
    ],
  },
  {
    id: 'intent.j02-energy',
    destinationId: 'destination.j02-energy-connected',
    aliases: [
      {
        id: 'alias.j02-canonical-title',
        phrase: 'Get electricity and gas connected',
        kind: 'intent',
      },
      {
        id: 'alias.j02-electricity-setup',
        phrase: 'ligar a eletricidade',
        kind: 'alias',
      },
      {
        id: 'alias.j02-gas-setup',
        phrase: 'contratar gás',
        kind: 'alias',
      },
      {
        id: 'alias.j02-existing-gas-connection',
        phrase: 'já tenho ligação de gás',
        kind: 'alias',
        extractedFacts: { 'household.hasGasConnection': true },
      },
      {
        id: 'alias.j02-energy-and-internet',
        phrase: 'preciso de eletricidade e internet',
        kind: 'alias',
      },
      {
        id: 'alias.j02-launch-label',
        phrase: 'Eletricidade e gás na nova casa',
        kind: 'alias',
      },
    ],
  },
  {
    id: 'intent.j03-internet',
    destinationId: 'destination.j03-internet-connected',
    aliases: [
      {
        id: 'alias.j03-canonical-title',
        phrase: 'Get internet connected',
        kind: 'intent',
      },
      {
        id: 'alias.j03-internet',
        phrase: 'internet',
        kind: 'alias',
      },
      {
        id: 'alias.j03-internet-setup',
        phrase: 'instalar internet',
        kind: 'alias',
      },
      {
        id: 'alias.j03-keep-number',
        phrase:
          'mudar de operador de internet e manter o meu número de telefone',
        kind: 'alias',
        extractedFacts: { 'household.wantsToKeepPhoneNumber': true },
      },
      {
        id: 'alias.j03-energy-and-internet',
        phrase: 'preciso de eletricidade e internet',
        kind: 'alias',
      },
      {
        id: 'alias.j03-launch-label',
        phrase: 'Internet numa mudança',
        kind: 'alias',
      },
    ],
  },
] satisfies IntentCatalog;

export const intentCatalog: IntentCatalog = intentCatalogSchema.parse(
  declaredIntentCatalog,
);

export interface IntentCatalogIssue {
  readonly kind: 'duplicateId' | 'danglingDestination';
  readonly id: string;
  readonly detail: string;
}

/** Validate search data against canonical routing entities without merging the two. */
export function checkIntentCatalog(
  catalog: IntentCatalog,
  destinations: readonly Pick<Destination, 'id'>[],
): IntentCatalogIssue[] {
  const issues: IntentCatalogIssue[] = [];
  const destinationIds = new Set(destinations.map(({ id }) => id));
  const seenIds = new Set<string>();

  for (const intent of catalog) {
    for (const id of [intent.id, ...intent.aliases.map((alias) => alias.id)]) {
      if (seenIds.has(id)) {
        issues.push({
          kind: 'duplicateId',
          id,
          detail: `duplicate intent catalog id "${id}"`,
        });
      }
      seenIds.add(id);
    }
    if (!destinationIds.has(intent.destinationId)) {
      issues.push({
        kind: 'danglingDestination',
        id: intent.id,
        detail: `references unknown destination "${intent.destinationId}"`,
      });
    }
  }
  return issues;
}
