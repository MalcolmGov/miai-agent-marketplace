# Security Incident Desk

- Job story: US Security Incident Desk — Structured security-incident intake and severity triage logging; escalate P0 immediately
- Golden path (turns):
  1. "What are the key facts?" → `get_incident_severity_guide` grounds: P0–P3 / incident commander / preserve evidence.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `open_security_incident`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
