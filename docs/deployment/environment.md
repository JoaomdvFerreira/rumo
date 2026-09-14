# Environment & secrets contract

Rumo has no database, authentication, or runtime content fetching
(`docs/architecture/stack.md`). Canonical content is compiled into the
application at build time from `src/content/`; there is nothing for the
deployed application to read from environment configuration today.

## Current contract

- **Runtime environment variables required by the application: none.**
  `src/` contains no `process.env` reads. This is verified, not assumed —
  confirmed by inspection at WU009.
- **Secrets held by the deployment platform: none.** No API keys, database
  URLs, or credentials exist for this project.
- Node and package-manager versions are pinned in `package.json`
  (`engines.node`, `packageManager`) rather than via environment variables,
  so the deployment platform's build image matches CI
  (`.github/workflows/ci.yml`) without duplicating the pin in `vercel.json`.

## Ownership rule for adding a variable

This contract exists so that a future variable is never added silently:

1. A new environment variable may only be introduced by an approved Work
   Unit that states the variable, its purpose, and which environment(s)
   (preview, production, or both) hold it.
2. The variable and its purpose must be recorded in this document in the
   same Work Unit that introduces it.
3. A variable must never carry a personal administrative fact, a raw
   user-supplied search string, or anything that would violate
   `docs/architecture/guardrails.md`.
4. Introducing a variable that implies a new backend dependency (database,
   auth provider, third-party API key) is out of scope for this milestone
   unless a Work Unit explicitly and separately approves that architectural
   change (`docs/architecture/stack.md` exclusions).
5. Local-only developer values (if ever needed) belong in `.env*.local`,
   which is already git-ignored (`.gitignore`) and must never be committed.

## Preview vs production ownership

- **Production** is the deployment tracking the `main` branch. Only the
  Project Overseer / repository owner controls what merges to `main`
  (`.github/AGENT_WORKFLOW.md`); no Work Unit or agent triggers a production
  deployment directly.
- **Preview** deployments are created automatically per Git branch/commit
  (including milestone and Work-Unit branches) and are owned by whoever is
  actively working that branch. Preview deployments are disposable and are
  never the target of external validation (G2.3) — only a pinned production
  candidate is (WU014/WU015).
- Neither environment currently differs in configuration, because there is
  no environment variable to differ on.
