# Claude handoff — active task

## ⚠️ Merge order (Cursor + Claude coordination)

| Order | PR | Status | Action |
|---|---|---|---|
| **1st** | [#17](https://github.com/MalcolmGov/miai-agent-marketplace/pull/17) `fix/eval-live-findings` | CI **green** | Merge first — fixes reply bugs in accounting/events/gym (+ hotel/pharmacy/mobile-money/vet) |
| **2nd** | [#16](https://github.com/MalcolmGov/miai-agent-marketplace/pull/16) `cursor/quality-scoreboard-phase3` | quality/secrets green; SonarCloud fail | **Rebase onto main after #17**, then merge — Depth: live for those 3 must sit on fixed runtime |

Do **not** merge #16 before #17. Claude wrote the note in the #17 PR body (avoided clobbering this handoff earlier); Cursor mirrored it on both PR comments + here.

---

## Active: verify Wave 4 live reconnect + Depth: live promotions (Cursor landed)

**Context:** Staging OAuth was reconnected (Google Calendar, Slack, HubSpot, Email). Cursor ran `proof:live --chat` + `--expand --auto-record` against `https://miaiweb-production.up.railway.app`.

**Evidence store:** `data/wave4-live-proofs.json`  
**Close / scoreboard context:** Phase 3 `/quality` in PR #16 (`docs/reports/flagship-depth-phase3-close-2026-08-03.md`)  
**Related:** PR #17 live-eval judgment fixes (merge first — see above).

### LIVE_PASS (promoted / refreshed Evidence)

| Agent | Corr (latest) | Connectors proven |
|---|---|---|
| `us-executive-assistant` | `corr_wave4_msd2c1l1` | google_calendar, slack |
| `us-dental-front-desk` | `corr_wave4_msd2c7pe` | google_calendar |
| `us-it-helpdesk` | `corr_wave4_msd2ceut` | hubspot, slack |
| `us-events-venue` | `corr_wave4_msd18yr3` | google_calendar → **Depth: live** |
| `us-home-services` | `corr_wave4_msd187lu` | google_calendar, slack |
| `us-clinic-front-desk` | `corr_wave4_msd18ch2` | google_calendar, slack |
| `us-salon-booking` | `corr_wave4_msd18uku` | google_calendar, slack |
| `us-gym-membership` | `corr_wave4_msd199sy` | slack → **Depth: live** |
| `us-accounting-practice` | `corr_wave4_msd19ldp` | slack → **Depth: live** |

`pnpm production:status`: US Depth live **11 / 100**; Wave 4 first-slice agents with recorded proof **4 / 4**.

### Residuals (do not over-claim)

| Agent | Result | Note |
|---|---|---|
| `us-sales-qualifier` | NO_TOOLS (this run) | `capture_lead` fired but not counted as live connector hit — investigate HubSpot live marking; prior Evidence `corr_wave4_msb98i0f` remains |
| `us-hotel-guest` | NO_TOOLS | expand prompts did not invoke tools |
| `us-pharmacy` | NO_TOOLS | expand handoff prompt did not invoke tools |

### Claude verify

1. Pilots for events-venue / gym-membership / accounting-practice say **`Depth: live`** with 2026-08-03 Evidence lines matching corr ids above  
2. `data/wave4-live-proofs.json` includes those corr ids (not sandbox)  
3. No ZA pack deletions; no Cluster B catalogue re-deepen  
4. Do **not** treat MockModel % as live quality; `/quality` remains hero-set only  
5. Optional: re-run sales-qualifier live proof after HubSpot live-marking fix

### Ops note

Staging still has `authMode`/`walletMode: mock` until MyInstantAI OIDC/wallet wire-up — expected.

---

## Closed: flagship depth Phases 1a / 1b / 2 / 3

- Phases 1a–1b–2: runtime workflows + pilots at strong (then live where Wave 4 proved)  
- Phase 3: `/quality` scoreboard — `docs/reports/flagship-depth-phase3-close-2026-08-03.md`

---

## ⚠️ NEVER delete unprefixed `data/catalog/*.agent.json`

Those **51 files are ZA (South Africa) market packs**, not orphans.

- Indexed catalogue = **100 × 5 = 500** (`africa-*` is the Africa/ZA sellable SKU)
- On disk = **500 + 51 ZA aliases = 551** (intentional)
- `families.json` maps `markets.za` → same id as `markets.africa`
- Only delete Finder junk: `* 2.json` / `*agent 2.json`
