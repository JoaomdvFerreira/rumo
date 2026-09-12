import type { Step } from '../../domain/model/step';
import type { Destination, LifeEvent, Route } from '../../domain/model/routing';

/**
 * J02 Electricity/gas. Modeled as two independent Steps (electricity, gas)
 * under one Destination rather than two Destinations, because ERSE
 * describes switching electricity and switching gas as the same
 * administrative process a household typically does together when
 * setting up a new home -- not two separate outcomes.
 */
const chooseElectricitySupplierStep: Step = {
  kind: 'task',
  id: 'step.j02-choose-electricity-supplier',
  title: 'Choose and sign up with an electricity supplier',
  description:
    'Compare electricity suppliers listed by ERSE and sign up with your chosen supplier; switching is free and the new supplier handles the change.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 10,
  completion: 'manual',
};

const electricitySwitchWaitStep: Step = {
  kind: 'wait',
  completion: 'externalOutcome',
  id: 'step.j02-electricity-switch-wait',
  title: 'Wait for the electricity switch to complete',
  description: 'The new supplier completes the switch, typically within five business days, without interrupting supply.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: ['step.j02-choose-electricity-supplier'],
  priority: 0,
  estimatedDurationDays: 5,
};

const chooseGasSupplierStep: Step = {
  kind: 'task',
  id: 'step.j02-choose-gas-supplier',
  title: 'Choose and sign up with a natural gas supplier',
  description:
    'Compare gas suppliers listed by ERSE and sign up with your chosen supplier; switching is free and the new supplier handles the change.',
  requirementIds: [],
  requirementGroupIds: [],
  appliesWhen: { kind: 'factTruthy', fact: 'household.hasGasConnection' },
  dependsOnStepIds: [],
  priority: 5,
  completion: 'manual',
};

const gasSwitchWaitStep: Step = {
  kind: 'wait',
  completion: 'externalOutcome',
  id: 'step.j02-gas-switch-wait',
  title: 'Wait for the gas switch to complete',
  description: 'The new supplier completes the switch, typically within five business days, without interrupting supply.',
  requirementIds: [],
  requirementGroupIds: [],
  appliesWhen: { kind: 'factTruthy', fact: 'household.hasGasConnection' },
  dependsOnStepIds: ['step.j02-choose-gas-supplier'],
  priority: 0,
  estimatedDurationDays: 5,
};

export const energySteps: Step[] = [
  chooseElectricitySupplierStep,
  electricitySwitchWaitStep,
  chooseGasSupplierStep,
  gasSwitchWaitStep,
];

export const energyRoute: Route = {
  id: 'route.j02-energy-standard',
  title: 'Standard electricity/gas setup route',
  priority: 0,
  stepIds: [
    chooseElectricitySupplierStep.id,
    electricitySwitchWaitStep.id,
    chooseGasSupplierStep.id,
    gasSwitchWaitStep.id,
  ],
  variantIds: [],
};

export const energyDestination: Destination = {
  id: 'destination.j02-energy-connected',
  title: 'Get electricity and gas connected',
  description: 'Set up electricity and, if applicable, natural gas supply at your new address.',
  routeIds: [energyRoute.id],
};

export const energyLifeEvent: LifeEvent = {
  id: 'lifeEvent.energy-setup',
  title: 'Electricity and gas',
  description: 'Setting up electricity and gas supply at a new home in Portugal.',
  destinationIds: [energyDestination.id],
};
