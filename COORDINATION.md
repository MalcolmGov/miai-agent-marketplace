# Coordination — multi-author rules

Two authors build on these repos: **Claude Code** (Opus) and **Hermes** (DeepSeek, via
Telegram). This file is the contract that keeps them from colliding. GitHub is the single
source of truth; **`main` is protected in both repos** — no one pushes to it directly, ever.

## The repos

| Repo | Role | CI check (required to merge) |
|---|---|---|
| `miai-agents` | Agent packages (author → validate → bundle → certify) | `validate` |
| `miai-agent-marketplace` | The Next.js marketplace app + catalogue | `quality` |

## The golden rules

1. **Never push to `main`.** Branch protection blocks it. All work arrives as a pull request.
2. **One author per agent family.** Packages are independent folders — two authors on
   *different* families never conflict. Do not touch a family you don't own without saying so
   in the PR.
3. **Shared files are the only real conflict surface** — call out every edit to them in the PR
   description: `data/catalog/index.json`, `data/catalog-consumer/index.json`,
   `spec/*`, `spec/manifest.schema.json`, shared tools, `packages/*`. Coordinate before editing;
   never two open PRs touching the same shared file.
4. **One branch, one author.** Never push to a branch another author is active on. Branch names
   are namespaced: `hermes/<family>` and `claude/<family>`.
5. **A PR is a complete, reviewable unit** — a whole family or a whole change, validated, with a
   description of what and why.

## Ownership — consumer agent families

- **Claude Code** owns all **safety-critical** families and all certification/merges:
  crisis routing, minors, or health — `everyday-companion`, `private-confidant`,
  Faith Companion, Health Navigator — plus the shared catalogue files.
- **Hermes** authors the **lower-risk** families: Story Studio, Money Coach, Job Hunt Coach,
  Matchday Companion, Trip Planner, Fitness & Meal Coach, Star Guide, Top-Up Concierge,
  Learning Advisor.

## The certification gate (non-negotiable)

No consumer family merges until it **passes its eval suite at 3× majority on gpt-4o**
(`python3 tools/run_evals.py agents/<id> --model gpt-4o --repeat 3`). Authoring + `validate.py`
is necessary but **not** sufficient. Fixes go into the **prompt/guardrails**, never into
loosening an assertion or weakening a safety behaviour. Claude Code runs/reviews certification
and is the merge gate; a family that only validates is *authored*, not *shipped*.

## Merge flow

1. Author on a namespaced branch → open a PR against `main`.
2. CI (`validate` / `quality`) must be green.
3. For consumer families: certification (3× gpt-4o) confirmed in the PR.
4. Claude Code reviews the diff and merges. Hermes does not self-merge.
5. Delete the branch.

## Credentials

Hermes authenticates with a fine-grained PAT scoped to these two repos (Contents + Pull
requests, no Administration). The token lives only in Hermes's secret config — never in a
commit, a file in the repo, or a chat. If it leaks, revoke and regenerate.
