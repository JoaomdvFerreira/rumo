# Privacy-safe observability

WU013 defines the MVP telemetry boundary. It does not configure an analytics
or monitoring provider, make a network request, add an environment variable,
or collect data outside the application.

`src/services/analytics/telemetry.ts` is the sole product-facing contract. Its
event vocabulary is a typed allow-list and its runtime schemas are strict:
only the declared event type plus a canonical content identifier, where that
is useful, can reach a provider. Raw search text, fact keys and values,
addresses, names, household information, and all other free-form
administrative content are forbidden. Unexpected fields are rejected rather
than forwarded.

Telemetry is best-effort. Invalid events and provider failures are swallowed,
so observability cannot block or alter a user's journey. The default facade
has no provider and is therefore a local no-op. Adding a provider or sending
even allow-listed events outside Rumo requires a separate explicit owner
decision and bounded work unit.
