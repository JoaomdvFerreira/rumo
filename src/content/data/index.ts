import { decisionReferences } from './decisions';
import {
  evoraWaterDestination,
  evoraWaterRoute,
  evoraWaterSteps,
} from './evoraWater';
import {
  citizenCardAddressRoute,
  fiscalAddressRoute,
  moveHomeDestination,
  moveHomeLifeEvent,
  moveHomeSteps,
} from './moveHome';
import {
  energyDestination,
  energyLifeEvent,
  energyRoute,
  energySteps,
} from './energy';
import {
  internetDestination,
  internetLifeEvent,
  internetPortabilityVariant,
  internetRoute,
  internetSteps,
} from './internet';
import { providers } from './providers';
import { requirementGroups, requirements } from './requirements';
import { sourceVerifications, sources } from './sources';
import type { ContentGraph } from '../graph';

/**
 * Representative MVP content graph (docs/product/mvp-scope.md): J01 Moving
 * home, J02 Electricity/gas, J03 Internet, and the Évora water
 * resolver/module. Assembled from the per-journey data modules above so
 * each journey stays independently readable and reviewable, while this
 * module is the single place that declares the full canonical package.
 */
export const contentGraph: ContentGraph = {
  lifeEvents: [moveHomeLifeEvent, energyLifeEvent, internetLifeEvent],
  destinations: [
    moveHomeDestination,
    evoraWaterDestination,
    energyDestination,
    internetDestination,
  ],
  routes: [
    citizenCardAddressRoute,
    fiscalAddressRoute,
    evoraWaterRoute,
    energyRoute,
    internetRoute,
  ],
  routeVariants: [internetPortabilityVariant],
  steps: [
    ...moveHomeSteps,
    ...evoraWaterSteps,
    ...energySteps,
    ...internetSteps,
  ],
  requirements,
  requirementGroups,
  providers,
  sources,
  sourceVerifications,
  decisionReferences,
};
