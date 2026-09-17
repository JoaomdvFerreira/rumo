import { describe, expect, it, vi } from 'vitest';

import { createTelemetry, telemetryEvents, type TelemetryProvider } from './telemetry';

describe('privacy-safe telemetry contract (WU013)', () => {
  it('allows only the declared event vocabulary and canonical identifiers', () => {
    const record = vi.fn();
    const telemetry = createTelemetry({ record });

    telemetry.track(telemetryEvents.destinationResolved('destination.j01-settle-new-address'));
    telemetry.track(telemetryEvents.requirementConfirmed('requirement.evora-water-nif'));
    telemetry.track(telemetryEvents.sourceDisclosed('source.gov-pt-mudar-de-casa'));
    telemetry.track(telemetryEvents.persistenceUnavailable());

    expect(record).toHaveBeenCalledTimes(4);
    expect(record).toHaveBeenNthCalledWith(1, {
      type: 'destination_resolved',
      destinationId: 'destination.j01-settle-new-address',
    });
    expect(record).toHaveBeenNthCalledWith(2, {
      type: 'requirement_confirmed',
      requirementId: 'requirement.evora-water-nif',
    });
    expect(record).toHaveBeenNthCalledWith(3, {
      type: 'source_disclosed',
      sourceId: 'source.gov-pt-mudar-de-casa',
    });
  });

  it('rejects raw search and administrative fact payloads at runtime', () => {
    const record = vi.fn();
    const telemetry = createTelemetry({ record });

    telemetry.track({ type: 'destination_resolved', destinationId: 'destination.j01-settle-new-address', searchText: 'Rua de Lisboa' });
    telemetry.track({ type: 'requirement_confirmed', requirementId: 'requirement.evora-water-nif', facts: { household: 'Silva' } });
    telemetry.track({ type: 'requirement_confirmed', requirementId: 'requirement.evora-water-nif', factValue: 'resident name' });

    expect(record).not.toHaveBeenCalled();
  });

  it('rejects free-form text inside otherwise allowed identifier fields at runtime', () => {
    const record = vi.fn();
    const telemetry = createTelemetry({ record });

    telemetry.track({ type: 'destination_resolved', destinationId: 'Rua de Lisboa, 12' });
    telemetry.track({ type: 'requirement_confirmed', requirementId: 'Maria Silva, 123456789' });
    telemetry.track({ type: 'source_disclosed', sourceId: 'Please call my landlord at 912 345 678' });
    telemetry.track({ type: 'source_disclosed', sourceId: 'source.not-in-rumo-content' });

    expect(record).not.toHaveBeenCalled();
  });

  it('contains provider failures so product code can continue', () => {
    const provider: TelemetryProvider = {
      record: () => {
        throw new Error('provider unavailable');
      },
    };
    const telemetry = createTelemetry(provider);

    expect(() => telemetry.track(telemetryEvents.sessionStarted())).not.toThrow();
  });

  it('is a no-op by default and does not introduce an external provider', () => {
    const telemetry = createTelemetry();

    expect(() => telemetry.track(telemetryEvents.sourceDisclosed('source.gov-pt-mudar-de-casa'))).not.toThrow();
  });
});
