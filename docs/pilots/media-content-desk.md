# Media Content Desk

- Job story: Content rights FAQ and intake for clearance/requests; never invent licence grants (Brightline Media / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_content_rights_faq` / knowledge.
  2. Customer asks to proceed with content request.
  3. Agent reads back details; customer says yes → `log_content_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Media & entertainment

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
