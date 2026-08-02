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
- Evidence: (correlation id / Loom — when available)
