import { describe, expect, it } from 'vitest';

import { stepSchema } from './step';

describe('stepSchema', () => {
  it('accepts a task step with a provider and channel', () => {
    const result = stepSchema.safeParse({
      kind: 'task',
      id: 'step.register-address',
      title: 'Register your new address',
      description: 'Submit proof of address to the municipal office.',
      requirementIds: ['requirement.proof-of-address'],
      providerId: 'provider.cme-evora',
      channelId: 'channel.cme-evora-desk',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a wait step with an estimated duration', () => {
    const result = stepSchema.safeParse({
      kind: 'wait',
      id: 'step.processing',
      title: 'Wait for processing',
      description: 'The municipality processes the registration.',
      estimatedDurationDays: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a subjourney step referencing a nested journey', () => {
    const result = stepSchema.safeParse({
      kind: 'subjourney',
      id: 'step.setup-utilities',
      title: 'Set up utilities',
      description: 'Complete the utilities setup subjourney.',
      journeyId: 'journey.eletricidade-e-gas',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a step missing its discriminant kind', () => {
    const result = stepSchema.safeParse({
      id: 'step.unknown',
      title: 'Unknown step',
      description: 'Missing kind.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a subjourney step missing journeyId', () => {
    const result = stepSchema.safeParse({
      kind: 'subjourney',
      id: 'step.setup-utilities',
      title: 'Set up utilities',
      description: 'Complete the utilities setup subjourney.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown step kind (closed semantics)', () => {
    const result = stepSchema.safeParse({
      kind: 'blocked',
      id: 'step.blocked',
      title: 'Blocked step',
      description: 'Blocking is derived at routing time, not stored as a kind.',
    });
    expect(result.success).toBe(false);
  });
});
