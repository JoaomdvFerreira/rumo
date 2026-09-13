import type { Step } from '../../domain/model/step';
import type {
  Destination,
  LifeEvent,
  Route,
  RouteVariant,
} from '../../domain/model/routing';

/**
 * J03 Internet. Models the ANACOM number-portability path (keep an
 * existing number when switching operator) as a RouteVariant of the
 * default new-installation Route: it is a fully alternate Step sequence,
 * not a conditional tweak of the same steps, which is exactly the
 * distinction RouteVariant exists for (see domain/model/routing.ts).
 */
const chooseInternetOperatorStep: Step = {
  kind: 'task',
  id: 'step.j03-choose-internet-operator',
  title: 'Choose an internet/telecom operator and sign up',
  description:
    'Compare operators and sign up for internet service at your new address.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 10,
  completion: 'manual',
};

const installationWaitStep: Step = {
  kind: 'wait',
  completion: 'externalOutcome',
  id: 'step.j03-installation-wait',
  title: 'Wait for technician installation',
  description:
    'The operator schedules and completes on-site installation of your internet connection.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: ['step.j03-choose-internet-operator'],
  priority: 0,
};

const requestPortabilityStep: Step = {
  kind: 'task',
  id: 'step.j03-request-portability',
  title: 'Request number portability with your CVP code',
  description:
    'Give your new operator the 12-digit CVP (Código de Validação da Portabilidade) code from your current operator to keep your existing number. Portability is free.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: [],
  priority: 10,
  completion: 'manual',
};

const portabilityWindowWaitStep: Step = {
  kind: 'wait',
  completion: 'externalOutcome',
  id: 'step.j03-portability-window-wait',
  title: 'Wait through the portability window',
  description:
    'Number portability completes within one business day, with a service interruption of at most three hours.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: ['step.j03-request-portability'],
  priority: 0,
  estimatedDurationDays: 1,
};

export const internetSteps: Step[] = [
  chooseInternetOperatorStep,
  installationWaitStep,
  requestPortabilityStep,
  portabilityWindowWaitStep,
];

export const internetRoute: Route = {
  id: 'route.j03-internet-new-installation',
  title: 'New internet installation',
  priority: 0,
  stepIds: [chooseInternetOperatorStep.id, installationWaitStep.id],
  variantIds: ['routeVariant.j03-keep-existing-number'],
};

export const internetPortabilityVariant: RouteVariant = {
  id: 'routeVariant.j03-keep-existing-number',
  title: 'Switch operator and keep existing phone number',
  appliesWhen: { kind: 'factTruthy', fact: 'household.wantsToKeepPhoneNumber' },
  priority: 0,
  stepIds: [requestPortabilityStep.id, portabilityWindowWaitStep.id],
};

export const internetDestination: Destination = {
  id: 'destination.j03-internet-connected',
  title: 'Get internet connected',
  description:
    'Set up internet service at your new address, keeping your existing phone number if you have one.',
  routeIds: [internetRoute.id],
};

export const internetLifeEvent: LifeEvent = {
  id: 'lifeEvent.internet-setup',
  title: 'Internet',
  description: 'Setting up internet service at a new home in Portugal.',
  destinationIds: [internetDestination.id],
};
