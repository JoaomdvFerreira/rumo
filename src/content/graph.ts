import { z } from 'zod';

import {
  decisionReferenceSchema,
  destinationSchema,
  lifeEventSchema,
  providerSchema,
  requirementGroupSchema,
  requirementSchema,
  routeSchema,
  routeVariantSchema,
  sourceDefinitionSchema,
  sourceVerificationSchema,
  stepSchema,
} from '../domain/model';

/**
 * The canonical content graph: every declarative entity collection the
 * routing engine (WU003) and `content:check` (WU004) operate over, keyed by
 * entity kind. This is a plain aggregate of the WU002 entity schemas -- it
 * adds no new entity shapes, only the container that lets a whole content
 * package be parsed and cross-validated as one unit.
 *
 * Channels are declared inline on a Provider in the domain model, so they
 * are not a separate top-level collection here.
 */
export const contentGraphSchema = z.strictObject({
  lifeEvents: z.array(lifeEventSchema),
  destinations: z.array(destinationSchema),
  routes: z.array(routeSchema),
  routeVariants: z.array(routeVariantSchema),
  steps: z.array(stepSchema),
  requirements: z.array(requirementSchema),
  requirementGroups: z.array(requirementGroupSchema),
  providers: z.array(providerSchema),
  sources: z.array(sourceDefinitionSchema),
  sourceVerifications: z.array(sourceVerificationSchema),
  decisionReferences: z.array(decisionReferenceSchema),
});

export type ContentGraph = z.infer<typeof contentGraphSchema>;
