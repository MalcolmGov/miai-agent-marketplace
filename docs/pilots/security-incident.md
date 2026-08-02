# Security Incident Desk

- Job story: Structured security-incident intake and severity triage logging; escalate P0 immediately (Northwind SecOps / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_incident_severity_guide` / knowledge.
  2. Customer asks to proceed with security incident.
  3. Agent reads back details; customer says yes → `open_security_incident` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Cybersecurity

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
