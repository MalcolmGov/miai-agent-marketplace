# Claude handoff — production readiness (not demo)

**Context:** Partner demo already completed successfully. Current work is **commercial agreement + production go-live**, not another demo polish pass.

## Non‑negotiables

1. Agents must be **fully working** for a real customer: knowledge, confirm-before-write, handoff, evals grounded, Install path clear.
2. Do **not** add “demo/UAT/Monday pitch” language to product UI or customer-facing docs.
3. Prefer **live connector readiness** (correct tool bindings, presets, failure copy) over marketing copy.
4. File ownership: see `PARALLEL_WORKSTREAMS.md` — do not edit files another agent owns.

## Recommended Claude slice (avoids Cursor collisions)

While Cursor clusters finish `us-*` heroes, Claude should take **market packs for Cluster B** (already deepened on US):

| Own these files only |
|---|
| `data/catalog/eu-restaurant-takeaway.agent.json` |
| `data/catalog/africa-restaurant-takeaway.agent.json` |
| `data/catalog/asia-restaurant-takeaway.agent.json` |
| Same pattern for: `salon-booking`, `clinic-front-desk`, `customer-support`, `delivery-tracking`, `trades-receptionist` |

For each pack variant:

- Localize knowledge (currency, compliance, hours, phone norms) to that market
- Keep tools/evals consistent with US hero intent; fix knowledge↔eval drift
- Confirm-before-write + handoff language preserved
- Update `docs/pilots/{family}.md` with market notes (append section, don’t rewrite US job story)

## Done means

A customer in that market can Rent → Configure knowledge → Connect tools → go live on website/App without Move Digital sitting in the chat.

## Do not

- Rewrite catalogue to “demo shortlist”
- Touch `monday-pilot.ts` / Sidebar / Agent Admin unless asked
- Claim SOC2 / live OAuth if credentials aren’t wired
