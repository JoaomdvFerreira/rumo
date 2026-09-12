import { evoraWaterDestination } from './evoraWater';
import type { Step } from '../../domain/model/step';
import type { Destination, LifeEvent, Route } from '../../domain/model/routing';

/**
 * J01 Moving home. Two direct national steps (fiscal address, Citizen Card
 * address) plus a subjourney into the Évora water module -- gated so it
 * only appears when the user's new address is in Évora, which is exactly
 * the declarative condition/subjourney composition WU002/WU003 exist to
 * support instead of bespoke branching code.
 */
const updateCitizenCardAddressStep: Step = {
  kind: 'task',
  id: 'step.j01-update-citizen-card-address',
  title: 'Update your address on the Citizen Card',
  description:
    'Updating your Citizen Card address automatically notifies the Tax Authority, Social Security, and the National Health Service.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 10,
  providerId: 'provider.portal-das-financas',
  completion: 'manual',
};

const updateFiscalAddressStep: Step = {
  kind: 'task',
  id: 'step.j01-update-fiscal-address',
  title: 'Confirm your tax (fiscal) address on Portal das Finanças',
  description:
    'If your Citizen Card address update has not yet propagated, update your fiscal address directly on Portal das Finanças.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: ['step.j01-update-citizen-card-address'],
  priority: 5,
  providerId: 'provider.portal-das-financas',
  channelId: 'channel.portal-das-financas-online',
  completion: 'manual',
};

const evoraWaterSubjourneyStep: Step = {
  kind: 'subjourney',
  id: 'step.j01-evora-water-subjourney',
  title: 'Set up water supply in Évora',
  description: 'Your new address is in Évora, so set up water supply through the municipal provider.',
  requirementIds: [],
  requirementGroupIds: [],
  appliesWhen: { kind: 'factEquals', fact: 'household.municipality', value: 'evora' },
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

export const moveHomeRoute: Route = {
  id: 'route.j01-move-home-standard',
  title: 'Standard move-home route',
  priority: 0,
  stepIds: [updateCitizenCardAddressStep.id, updateFiscalAddressStep.id, evoraWaterSubjourneyStep.id],
  variantIds: [],
};

export const moveHomeDestination: Destination = {
  id: 'destination.j01-settle-new-address',
  title: 'Settle into your new address',
  description: 'Update your official address and, where applicable, set up municipal water supply.',
  routeIds: [moveHomeRoute.id],
};

export const moveHomeLifeEvent: LifeEvent = {
  id: 'lifeEvent.moving-home',
  title: 'Moving home',
  description: 'Moving home or setting up a new home in Portugal.',
  destinationIds: [moveHomeDestination.id, evoraWaterDestination.id],
};
