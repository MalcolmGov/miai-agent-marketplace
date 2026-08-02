# Contributing

Thank you for helping improve the MyInstantAI Agent Marketplace. This repo is a **pnpm workspace** monorepo.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9.x (`corepack enable` recommended)

```bash
pnpm install
pnpm build:packages   # build shared packages before web dev
pnpm dev              # http://localhost:3000
```

## License

Contributions are accepted under the **[Apache License 2.0](LICENSE)**. By submitting a pull request, you agree that your contribution is licensed under those terms.

## Quality gate

Before opening a PR, run the same gate CI uses:

```bash
pnpm run ci
```

This runs package build, typecheck, unit tests, and the static eval suite. PRs **must pass CI** on GitHub Actions (`.github/workflows/ci.yml`) before merge.

Optional locally: `pnpm lint` in `apps/web` (CI lint is separate).

## Catalogue and market packs

The sellable catalogue is **100 agent families × 5 markets = 500 indexed SKUs** (US, EU, Africa, Asia, Oceania). See [docs/adr/0001-catalog-100x5.md](docs/adr/0001-catalog-100x5.md).

**Do not delete ZA unprefixed packs** (`data/catalog/{family}.agent.json`). They are legacy aliases retained on disk after the ZA → Africa merge. Indexed families point `markets.za` at the corresponding `africa-*` id.

Regenerate catalogue metadata via scripts — do not hand-edit `families.json` or `index.json`:

| Task | Command |
|---|---|
| Import upstream agent packages | `pnpm import:catalog` |
| Generate missing market variants | `pnpm generate:packs` |
| Merge ZA footprint into Africa ids | `pnpm merge:za-africa` |
| Polish overlays + readiness fields | `pnpm polish:catalog` |
| Regenerate connector presets | `pnpm generate:presets` |
| Full ship gate | `pnpm catalogue:ship` |

See [docs/MARKET_PACKS.md](docs/MARKET_PACKS.md) for pack conventions.

## Pull requests

1. Branch from `main`.
2. Keep changes focused; match existing code style.
3. Ensure `pnpm run ci` is green.
4. Describe **why** in the PR body; link related issues or ADRs when relevant.

## Architecture decisions

Significant design choices are recorded in [docs/adr/](docs/adr/). Add a new ADR when introducing a durable cross-cutting decision.

## Security

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).
