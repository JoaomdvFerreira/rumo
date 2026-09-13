import { z } from 'zod';

import { entityIdSchema } from './identifiers';

/**
 * A Channel is one concrete way to interact with a Provider (in person,
 * online portal, phone, post). Kept as a closed enum so routing logic
 * never has to interpret free-text channel descriptions.
 */
export const channelTypeSchema = z.enum(['online', 'inPerson', 'phone', 'post', 'email']);

export const channelSchema = z.strictObject({
  id: entityIdSchema,
  type: channelTypeSchema,
  label: z.string().min(1),
  url: z.url().optional(),
});

export type Channel = z.infer<typeof channelSchema>;

export const providerSchema = z.strictObject({
  id: entityIdSchema,
  name: z.string().min(1),
  jurisdiction: z.string().min(1),
  channels: z.array(channelSchema).min(1),
  sourceId: entityIdSchema,
});

export type Provider = z.infer<typeof providerSchema>;
