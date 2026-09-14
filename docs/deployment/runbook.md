# Deployment runbook

WU009 (M03.2 — Production Candidate & External Validation Readiness).
This establishes the reproducible Git-to-deployment path and environment
contract; it does not claim public-launch readiness and introduces no
server persistence, database, authentication, or runtime content fetching
(`docs/architecture/stack.md`).

## Target platform

Vercel, deploying directly from this Git repository. No concrete blocker
to Vercel was found: the application is a standard Next.js App Router
project with default (server) build output — no static export, no custom
server, no Node APIs outside the Next.js build pipeline — which Vercel
supports natively with zero custom routing/function configuration.

`vercel.json` at the repository root pins:

- `framework: "nextjs"` — explicit rather than relying on auto-detection.
- `installCommand: "pnpm install --frozen-lockfile"` — matches CI
  (`.github/workflows/ci.yml`), so the deployed build resolves the exact
  same dependency graph as every validated commit.
- `buildCommand: "pnpm build"` — the same command validated locally and in
  CI; no deployment-only build path exists.

Node version and package-manager version are **not** duplicated in
`vercel.json`; Vercel reads `engines.node` (`24.x`) and `packageManager`
(`pnpm@11.12.0`) from `package.json`, which is the same source CI uses
(`actions/setup-node` with `node-version: 24`, `pnpm/action-setup` with
`version: 11.12.0`). This keeps one canonical place for the runtime pin
instead of two that can drift.

## Git-to-deployment path

1. A commit lands on any branch pushed to the GitHub remote.
2. Vercel's Git integration builds that commit with the install/build
   commands above, using the pinned Node/pnpm versions.
3. **Every branch other than `main`** (including this milestone branch and
   any Work-Unit-scoped branch) produces a **preview deployment** — a
   unique, shareable URL tied to that exact commit SHA.
4. **A push/merge to `main`** produces the **production deployment** —
   the single canonical URL representing the current production candidate.
5. Because deployments are 1:1 with Git commits, every deployment is
   traceable back to an exact `git log` entry by construction: the Vercel
   dashboard/CLI records the deployed commit SHA for both preview and
   production deployments, and the reverse lookup (`git log <sha>`) always
   resolves in this repository's history.

No manual/out-of-band deployment path exists or is introduced by this WU;
the only way to deploy is to push a commit.

## Preview vs production ownership

See `docs/deployment/environment.md` for the ownership rule. In summary:
production tracks `main` and is controlled only by the repository owner /
Project Overseer merge decision; preview deployments are per-branch and
owned by whoever is working that branch, and are never treated as the
external-validation target.

## Rollback

Because deployment is a pure function of the deployed commit:

- To roll back production, revert or reset `main` to a previously-known
  good commit and push; Vercel builds and promotes that commit the same
  way as any other production push. No deployment-side state exists to
  migrate or undo (no database).
- A bad preview deployment has no rollback procedure of its own — it is
  simply superseded by the next commit on that branch, or discarded.

## Traceability baseline

- Every deployment (preview or production) is addressable by its Git
  commit SHA via the Vercel platform's own commit-to-deployment mapping;
  no additional custom build-id or version file is introduced by this WU.
- Binding a human-readable release/candidate identity (e.g. surfaced in
  the running application itself) to a deployment is explicitly WU012's
  scope ("Runtime Resilience & Release Identity"), not WU009's — this WU
  only establishes that the Git-to-deployment mapping itself is
  reproducible and inspectable from the platform side.

## External verification record

A Vercel project (`rumo`, under the `joaomdvferreiras-projects` scope) was
created and connected to `https://github.com/JoaomdvFerreira/rumo` to
verify this WU's Git-to-deployment contract against a real deployment,
rather than relying on configuration inspection alone. The project's
Framework Preset (Next.js), Build Command (`pnpm build`), and Install
Command (`pnpm install --frozen-lockfile`) were confirmed to match
`vercel.json` exactly, Node.js Version is `24.x`, and zero environment
variables exist on the project, matching `docs/deployment/environment.md`.
The project's production branch tracks the GitHub repository's default
branch, `main`; no override was configured. This commit, pushed to the
`milestone/m032-production-candidate` branch, is the first commit to
trigger the Git-integrated preview deployment for external verification.

## What this WU does not do

- Does not perform a `main`-branch production deployment; the milestone
  branch is not merged to `main` as part of this WU or its verification
  (`.github/AGENT_WORKFLOW.md` reserves that merge decision for the
  repository owner / Project Overseer). Production-candidate verification
  uses a non-`main` Vercel deployment mechanism that preserves exact Git
  SHA provenance without altering the configured production branch.
- Does not add CI enforcement of the release-quality gate beyond what
  already exists — that is WU010.
- Does not add security headers — that is WU011.
- Does not add release-identity surfacing in the running app — that is
  WU012.
- Does not add telemetry — that is WU013.
