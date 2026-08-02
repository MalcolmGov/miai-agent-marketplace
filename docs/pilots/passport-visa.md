# Passport & Visa Desk

- Job story: US Passport & Visa Desk — Passport and visa process FAQ and appointment/intake logging; never immigration advice
- Golden path (turns):
  1. "What are the key facts?" → `get_passport_visa_info` grounds: Form DS-11 / passport renewal 6–8 weeks / photo requirements.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_passport_enquiry`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
