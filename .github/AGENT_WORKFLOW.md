# Agent workflow

AIQT is the canonical operational state; the external Project Overseer owns roadmap, architecture approval, WU definition, scope changes, milestone gates, acceptance, next-work decisions, and final merges. The Development Agent executes only the active bounded WU.

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

## Validate

10. Stop WU-started processes.
11. Run required validation.
12. Run `git diff --check`, review `git diff`, and review `git status`.

## Close

13. Record AIQT checkpoint/evidence and findings or risks.
14. Commit all persistent WU changes.
15. Create the canonical WU completion tag.
16. Verify a clean tree, return a concise report, and stop.

Persistent WU changes must be committed before a WU is considered complete. Servers/processes started by a WU must be stopped before commit and closure.

## Milestone delivery

`main → milestone branch → bounded AIQT WUs → each WU validated + committed + tagged → milestone validation → push → PR to main → CI → Project Overseer review → owner merge → main sync verification`

Do not auto-merge; the owner controls final merge.
