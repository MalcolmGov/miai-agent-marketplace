# Cybersecurity Desk

- Job story: Security policy FAQ and intake for suspected incidents; never invent containment status (Northwind SecOps / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_security_policy` / knowledge.
  2. Customer asks to proceed with security report.
  3. Agent reads back details; customer says yes → `log_security_report` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Cybersecurity

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
