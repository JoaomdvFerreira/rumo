# Agent workflow

AIQT is the canonical operational state; the external Project Overseer owns roadmap, architecture approval, WU definition, scope changes, milestone gates, acceptance, next-work decisions, and final merges. The Development Agent executes only the active bounded WU and hands off for review — it does not close its own WU.

AIQT (0.46.8) has no built-in reviewer role or authentication: the CLI does not distinguish "Development Agent" from "Project Overseer" as actors. The separation below is a durable-instruction and process convention, not something AIQT enforces mechanically. Development Agents follow it because these documents say so, not because the tool blocks another path.

## Start

1. Confirm repository root.
2. Inspect `git status`.
3. Run `aiqt status` and `aiqt next`.
4. Read the active WU packet and `suggestedFiles`.
5. Read only relevant canonical docs.
6. Confirm scope and exclusions.

## Execute

7. Implement only the active WU and keep changes bounded.
8. Run focused validation during work and record meaningful findings.
9. Do not expand scope automatically.

## Development Agent handoff (`needs_review`)

After implementation, the Development Agent hands the WU to review — it does not accept its own work:

10. Stop WU-started processes.
11. Run required validation.
12. Run `git diff --check`, review `git diff`, and review `git status`.
13. Record implementation evidence/findings via `aiqt checkpoint` (`--from-file` or piped JSON), targeting `needs_review` as the checkpoint's `targetStatus`.
14. Commit all persistent WU changes, including legitimate AIQT state (`.aiqt/state.json`, `.aiqt/runlog.jsonl`).
15. Push the milestone branch.
16. Verify a clean, synchronized tree (`git status`).
17. Return a concise review report to the Project Overseer, and STOP.

At handoff:

```text
NO completion tag
NO next WU
NO final acceptance claim
```

## Project Overseer review / closure

Only after explicit Project Overseer acceptance may a subsequent authorized closure action proceed. AIQT's supported mechanism for recording that acceptance is `aiqt checkpoint amend --checkpoint <id> --acceptance <result> --validation <result> --reason "<text>"`, which amends the effective validation/acceptance result of the WU's checkpoint without rewriting checkpoint history.

**Verified transition behavior (AIQT 0.46.8 source, read-only inspection, not invented):**

* `aiqt checkpoint amend` recording `--acceptance passed --validation passed` **does itself transition the WU from `needs_review` to `done`** — but only when all of the following hold at once: the amended checkpoint is the *latest* checkpoint recorded for that WU, the resulting effective validation and acceptance results are both `passed` with no unfinished work and no open high/critical issue, and `currentWorkUnitId` is not the same WU (i.e. no packet is actively selected for it). If any condition fails, the amendment is stored (the effective result is still updated) but the WU status is left unchanged — a second, corrected amendment is the way to complete the transition, not a separate close command.
* A `needs_review` checkpoint is a terminal checkpoint disposition, so `currentWorkUnitId` is already cleared to `null` as soon as the Development Agent's handoff checkpoint is recorded — the Project Overseer does not need to run `aiqt next`/select the WU again before amending; `aiqt checkpoint amend` operates on the checkpoint id directly, independent of `currentWorkUnitId`.
* `aiqt checkpoint` itself must not be called again for an already-checkpointed WU to change its outcome — that would create a new checkpoint, not correct the existing one. `aiqt checkpoint amend` is the correct, supported command for recording the Overseer's decision.
* There is no separate "accept" or "close" command distinct from `checkpoint amend`; `done` is a side effect of a passing amendment, not a status set directly.

Sequence:

1. Confirm the WU's latest checkpoint id (`aiqt status`/`aiqt review`, read-only) and that it is still the latest for that WU.
2. Record the decision: `aiqt checkpoint amend --checkpoint <id> --acceptance <passed|failed|partial|not_checked> --validation <passed|failed|partial|not_run> --reason "<Overseer decision>"`.
3. If both effective results are `passed` and the completion gate is met, AIQT transitions the WU to `done` as part of this same command — confirm via the command's own output (`workUnitStatusAfter`) or `aiqt status`, rather than assuming success.
4. If the transition did not occur despite a `passed`/`passed` amendment, treat it as a signal to inspect why (stale checkpoint, active `currentWorkUnitId`, unresolved issue) before re-amending — never force status by any other means.
5. Commit any persistent AIQT acceptance changes (`.aiqt/state.json`, `.aiqt/runlog.jsonl`).
6. Create the canonical WU completion tag only once `aiqt status` confirms the WU is `done` — using the active milestone's fixed prefix (see below) at the final accepted closure SHA.
7. Push branch and tag.
8. Verify a clean, synchronized tree.
9. STOP.

If review fails:

```text
needs_review
→ bounded remediation
→ validation
→ commit
→ push
→ needs_review
→ re-review
```

A failing or partial amendment never transitions the WU to `done` — the completion gate requires both effective results to be `passed`. Do not create intermediate `done` tags. A `*-done` tag is only ever created after `aiqt status` confirms `done`, following explicit Project Overseer acceptance, at the accepted SHA.

### Completion tag prefix (per milestone)

Each project-facing milestone has a fixed completion-tag prefix. This prefix is a milestone-numbering convention chosen for this repository; it is **not** derived from the internal AIQT milestone id and must not be recomputed from it. Use the prefix that matches the milestone the WU belongs to:

* Milestone M03.1 (AIQT `M001`) → prefix `m031` — e.g. `m031-wu003-done` — matching the existing `m031-wu001-done` and `m031-wu002-done` tags. M03.1 is closed; this rule is historical and must not be changed.
* Milestone M03.2 (AIQT `M002`) → prefix `m032` — e.g. `m032-wu009-done`.

## Milestone delivery

```text
main
→ milestone branch
→ bounded WU
→ validate
→ commit
→ push
→ needs_review
→ Project Overseer review
→ accepted closure + tag
→ next WU
→ ...
→ final milestone validation
→ PR to main
→ CI
→ Project Overseer milestone review
→ owner merge
→ main sync
```

Persistent WU changes must be committed before a WU is considered complete. Servers/processes started by a WU must be stopped before commit and closure. Do not auto-merge; the owner controls final merge.
