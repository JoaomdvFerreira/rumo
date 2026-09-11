# Versioning

Version the application, canonical content, and persisted-state schema independently. Content has a deterministic hash. When content changes, persisted state is revalidated against the new content version before it is trusted or resumed.
