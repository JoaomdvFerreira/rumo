import { describe, expect, it, vi } from 'vitest';

import { createTelemetry, telemetryEvents, type TelemetryProvider } from './telemetry';

describe('privacy-safe telemetry contract (WU013)', () => {
  it('allows only the declared event vocabulary and canonical identifiers', () => {
    const record = vi.fn();
    const telemetry = createTelemetry({ record });

    telemetry.track(telemetryEvents.destinationResolved('water-service'));
    telemetry.track(telemetryEvents.persistenceUnavailable());

    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenNthCalledWith(1, {
      type: 'destination_resolved',
      destinationId: 'water-service',
    });
  });

  it('rejects raw search and administrative fact payloads at runtime', () => {
    const record = vi.fn();
    const telemetry = createTelemetry({ record });

    telemetry.track({ type: 'destination_resolved', destinationId: 'water-service', searchText: 'Rua de Lisboa' });
    telemetry.track({ type: 'requirement_confirmed', requirementId: 'water-contract', facts: { household: 'Silva' } });
    telemetry.track({ type: 'requirement_confirmed', requirementId: 'water-contract', factValue: 'resident name' });

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

    expect(() => telemetry.track(telemetryEvents.sourceDisclosed('evora-water'))).not.toThrow();
  });
});
