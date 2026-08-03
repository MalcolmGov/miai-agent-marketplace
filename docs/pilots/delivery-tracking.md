# Delivery & Tracking

- Job story: When a SwiftLane sender or recipient pastes a waybill, they get live status or POD, and exceptions are logged only after confirm — lost/damaged parcels always reach the courier desk.
- Golden path (turns):
  1. Customer: "Where's my parcel? Waybill SLC-4821"
  2. Agent: `track_consignment` → status / ETA
  3. Customer: "It shows delivered — send POD"
  4. Agent: `get_proof_of_delivery` → signer / time (or no POD yet)
  5. Customer: "Tracking says delivered but I never got it"
  6. Agent: read-back waybill + issue → confirm → `log_exception` + `handoff_to_human`
  7. (Alt) No waybill → ask for waybill / tracking number first
  8. (Alt) Overnight price → `$28` / next business day before 3:00 PM cut-off
- Live connectors required: Carrier TMS / tracking API; Slack/Teams for exception desk
- Depth: strong
- Evidence: `corr_flagship_1b_delivery-tracking_mscuy561` — sandbox `executeConnector` webhook `log_exception` → REF-1001 (2026-08-03); runtime workflow only (Cluster B catalogue untouched); promote to Depth: live only after OAuth/`pnpm eval:live --set=flagship-1b`

## Market packs (EU / Africa / Asia)

Same job story and golden path as the US hero, localized per region. Confirm-before-write and clean desk handoff are identical across all packs.

- **EU** (`eu-delivery-tracking`): currency €/EUR (Overnight €28, Road Express €16, Economy €11 per parcel up to 5 kg); compliance GDPR; channels SMS, web, app; languages en, de, fr, es, it; emergency 112; desk hours in Central European Time; example hub Frankfurt.
- **Africa** (`africa-delivery-tracking`): currency-neutral amounts (Overnight 28, Road Express 16, Economy 11 — local currency, per parcel up to 5 kg); compliance POPIA + regional privacy; channels WhatsApp (primary), web, app, SMS; languages en, fr, sw; emergency local emergency services; multi-country regional hubs; desk follows up on the same WhatsApp thread.
- **Asia** (`asia-delivery-tracking`): currency-neutral amounts (Overnight 28, Road Express 16, Economy 11 — local currency, per parcel up to 5 kg); compliance PDPA + regional privacy; channels web, app, SMS; languages en, zh, hi; emergency local emergency services; example hub Singapore.
