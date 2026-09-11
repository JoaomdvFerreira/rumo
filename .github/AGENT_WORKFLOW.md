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

Only after explicit Project Overseer acceptance may a subsequent authorized closure action proceed. AIQT's supported mechanism for recording that acceptance is `aiqt checkpoint amend`, which amends the effective validation/acceptance result of an existing checkpoint with a `--reason`, and/or `aiqt review acknowledge <findingKey>` for individual findings — both without rewriting checkpoint history.

1. Record acceptance via `aiqt checkpoint amend --acceptance passed --validation passed --reason "<Overseer decision>"` (or `failed`/`partial` if review fails).
2. Confirm the WU's canonical status is `done` (a `checkpoint` with `targetStatus: done`, or the amendment, transitions it once accepted).
3. Commit any persistent AIQT acceptance changes.
4. Create the canonical WU completion tag (`m0<milestone>-wu<NNN>-done`) at the final accepted closure SHA.
5. Push branch and tag.
6. Verify a clean, synchronized tree.
7. STOP.

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

Do not create intermediate `done` tags. A `*-done` tag is only ever created after explicit Project Overseer acceptance, at the accepted SHA.

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
