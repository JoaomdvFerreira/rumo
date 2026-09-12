import type { Step } from '../../domain/model/step';
import type { Destination, Route } from '../../domain/model/routing';

/**
 * Évora water resolver/module: the deeper municipal-support slice called
 * for by docs/product/mvp-scope.md. Modeled as its own Destination so it
 * can be reached directly (moving to Évora) or referenced as a subjourney
 * step from J01 (see moveHome.ts) without duplicating content -- exactly
 * the composition WU003's subjourney semantics exist for.
 *
 * Only one Route is declared (online/in-person/phone are exposed as
 * Channels on the single municipal Provider, not as separate content
 * Routes) because CM Évora's own page does not describe channel-specific
 * differences in requirements. This is a deliberate MVP simplification,
 * not a placeholder: the `requirementGroupIds` gating already gives
 * `content:check` and the engine identical eligibility behavior regardless
 * of which channel is chosen.
 */
const evoraWaterRequestContractStep: Step = {
  kind: 'task',
  id: 'step.j01-evora-water-request-contract',
  title: 'Request a new water supply contract with Câmara Municipal de Évora',
  description:
    'Submit a request for a new water supply contract for your Évora address, providing identification, proof of occupancy, and your NIF.',
  requirementIds: [],
  requirementGroupIds: ['requirementGroup.evora-water-new-contract'],
  dependsOnStepIds: [],
  priority: 0,
  providerId: 'provider.cm-evora-aguas',
  channelId: 'channel.cm-evora-aguas-online',
  completion: 'externalOutcome',
};

const evoraWaterConnectionWaitStep: Step = {
  kind: 'wait',
  completion: 'externalOutcome',
  id: 'step.j01-evora-water-connection-wait',
  title: 'Wait for the water connection to be activated',
  description: 'CM Évora processes the request and activates the supply once connection conditions are confirmed.',
  requirementIds: [],
  requirementGroupIds: [],
  dependsOnStepIds: ['step.j01-evora-water-request-contract'],
  priority: 0,
  estimatedDurationDays: 5,
};

export const evoraWaterSteps: Step[] = [evoraWaterRequestContractStep, evoraWaterConnectionWaitStep];

export const evoraWaterRoute: Route = {
  id: 'route.j01-evora-water-request',
  title: 'Request water supply from Câmara Municipal de Évora',
  priority: 0,
  stepIds: [evoraWaterRequestContractStep.id, evoraWaterConnectionWaitStep.id],
  variantIds: [],
};

export const evoraWaterDestination: Destination = {
  id: 'destination.j01-evora-water-connection',
  title: 'Set up water supply in Évora',
  description: 'Get water supply connected at your new Évora address through the municipal provider.',
  routeIds: [evoraWaterRoute.id],
};
