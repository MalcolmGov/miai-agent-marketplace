# Branded PDFs — Monday pack

Visual leave-behinds for MyInstantAI Agents commercial meetings.

## Outputs

Generated into `output/`:

| File | Use |
|---|---|
| `MyInstantAI-x-MoveDigital-Partnership-Proposal.pdf` | **Primary** 4-page partnership proposal + commercials |
| `MyInstantAI-Agents-One-Pager.pdf` | Executive one-pager |
| `MyInstantAI-Agents-Commercial-Leavebehind.pdf` | 2-page commercial decisions + asks |
| `MyInstantAI-Agents-Monday-Demo-Pilot6.pdf` | Demo shortlist + timed script |

## Regenerate

Requires Google Chrome on macOS (or set `CHROME_PATH`).

```bash
pnpm pdf:branded
# or: node docs/branded-pdfs/generate.mjs
```

Edit the `.html` + `shared.css` sources, then re-run.
