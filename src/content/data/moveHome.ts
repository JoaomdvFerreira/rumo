import { evoraWaterDestination } from './evoraWater';
import type { Step } from '../../domain/model/step';
import type { Destination, LifeEvent, Route } from '../../domain/model/routing';

/**
 * J01 Moving home. Address routing is split into two mutually exclusive,
 * explicitly fact-gated Routes on the same Destination (F1 remediation,
 * Project Overseer review of WU004/C004): whether the person holds a
 * Portuguese Citizen Card determines the entire correct path, and the two
 * paths must never be presented together or defaulted when the fact is
 * unknown.
 *
 * - `household.hasCitizenCard === true`: change the Citizen Card address
 *   (gov.pt/Autenticação.gov.pt); this automatically notifies the Tax
 *   Authority, Social Security, and SNS, so no separate Portal das
 *   Finanças step is ever shown alongside it.
 * - `household.hasCitizenCard === false`: update the fiscal domicile
 *   directly on Portal das Finanças; this is the only path Portal das
 *   Finanças appears on.
 *
 * Deliberately two Routes rather than a Route + RouteVariant: neither
 * path may be the Destination's unconditional default. When the fact is
 * absent, `selectRoute` (engine/route.ts) finds no applicable Route and
 * the Destination resolves `unresolved` -- never a false assumption of
 * either path, and never a synthetic "tell us your Citizen Card status"
 * step invented merely to fill the gap. Collecting the missing fact is a
 * future questionnaire/UI concern, not a WU004 content concern.
 *
 * The Évora water subjourney is independent of Citizen Card status, so it
 * is attached to both Routes rather than encoding a third axis of
 * variation into this split.
 */
const updateCitizenCardAddressStep: Step = {
  kind: 'task',
  id: 'step.j01-update-citizen-card-address',
  title: 'Update your address on the Citizen Card',
  description:
    'Updating your Citizen Card address automatically notifies the Tax Authority, Social Security, and the National Health Service -- do not also update the fiscal address separately.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 10,
  providerId: 'provider.autenticacao-gov-cartao-cidadao',
  channelId: 'channel.autenticacao-gov-cartao-cidadao-online',
  completion: 'manual',
};

const updateFiscalAddressStep: Step = {
  kind: 'task',
  id: 'step.j01-update-fiscal-address',
  title: 'Update your fiscal domicile on Portal das Finanças',
  description:
    'If you do not hold a Portuguese Citizen Card, update your fiscal (tax) domicile directly on Portal das Finanças.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 10,
  providerId: 'provider.portal-das-financas',
  channelId: 'channel.portal-das-financas-online',
  completion: 'manual',
};

const evoraWaterSubjourneyStep: Step = {
  kind: 'subjourney',
  id: 'step.j01-evora-water-subjourney',
  title: 'Set up water supply in Évora',
  description:
    'Your new address is in Évora, so set up water supply through the municipal provider.',
  requirementIds: [],
  requirementGroupIds: [],
  appliesWhen: {
    kind: 'factEquals',
    fact: 'household.municipality',
    value: 'evora',
  },
  dependsOnStepIds: [],
  priority: 1,
  destinationId: evoraWaterDestination.id,
  completion: 'subjourney',
};

export const moveHomeSteps: Step[] = [
  updateCitizenCardAddressStep,
  updateFiscalAddressStep,
  evoraWaterSubjourneyStep,
];

export const citizenCardAddressRoute: Route = {
  id: 'route.j01-citizen-card-address',
  title: 'Update address via Citizen Card',
  appliesWhen: {
    kind: 'factEquals',
    fact: 'household.hasCitizenCard',
    value: true,
  },
  priority: 0,
  stepIds: [updateCitizenCardAddressStep.id, evoraWaterSubjourneyStep.id],
  variantIds: [],
};

export const fiscalAddressRoute: Route = {
  id: 'route.j01-fiscal-address-direct',
  title: 'Update fiscal address directly (no Citizen Card)',
  appliesWhen: {
    kind: 'factEquals',
    fact: 'household.hasCitizenCard',
    value: false,
  },
  priority: 0,
  stepIds: [updateFiscalAddressStep.id, evoraWaterSubjourneyStep.id],
  variantIds: [],
};

export const moveHomeDestination: Destination = {
  id: 'destination.j01-settle-new-address',
  title: 'Settle into your new address',
  description:
    'Update your official address and, where applicable, set up municipal water supply.',
  routeIds: [citizenCardAddressRoute.id, fiscalAddressRoute.id],
};

export const moveHomeLifeEvent: LifeEvent = {
  id: 'lifeEvent.moving-home',
  title: 'Moving home',
  description: 'Moving home or setting up a new home in Portugal.',
  destinationIds: [moveHomeDestination.id, evoraWaterDestination.id],
};
