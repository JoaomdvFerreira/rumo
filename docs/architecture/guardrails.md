# Architecture guardrails

- The domain is framework-independent; it cannot import React, Next, app, or server layers.
- Canonical content is declarative: no executable callbacks in rules. A small Condition DSL is the intended rule-expression direction.
- `SourceDefinition` is not `SourceVerification`.
- Persist locally with versioned schemas, content hashing/versioning, and revalidation after content changes.
- Respect the Next.js/localStorage hydration boundary.
- Never place personal administrative facts in URLs.
