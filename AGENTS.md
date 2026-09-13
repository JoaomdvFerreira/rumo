# Rumo

Rumo provides clear, trustworthy guidance for people moving home and setting up a new home in Portugal. The frozen MVP wedge starts with deeper municipal support for Évora.

The core stack is Node 24, Next.js App Router, React, TypeScript, pnpm, Zod, Vitest, fast-check, Playwright, axe, ESLint, Prettier, and CSS Modules with CSS variables. There is no database or authentication.

Read `.github/AGENT_WORKFLOW.md` before implementation work.

AIQT is the canonical project/work state. Do not invent work outside the active Work Unit. The external Project Overseer owns roadmap, architecture approvals, Work Unit scope, gates, acceptance, next-work decisions, and final merges. Development Agents execute only the active bounded WU.

Development Agents stop at review handoff (`needs_review`) and never mark their own implementation as finally accepted. Only the Project Overseer accepts a WU. A `*-done` completion tag may be created only after explicit Project Overseer acceptance, never before. Do not start the next WU without Project Overseer authorization. See `.github/AGENT_WORKFLOW.md` for the full procedure.

Keep the domain framework-independent and content declarative. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` before closure.

Do not commit secrets, personal administrative facts in URLs, or raw free-text analytics by default. Read [the workflow](.github/AGENT_WORKFLOW.md), [architecture guardrails](docs/architecture/guardrails.md), [stack](docs/architecture/stack.md), and relevant governance/product docs before changing code.
