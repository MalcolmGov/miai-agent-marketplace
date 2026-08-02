# Investment Advisor Intake

- Job story: US Investment Advisor Intake — Intake for advisor introduction and risk questionnaire logging; never personalized investment advice
- Golden path (turns):
  1. "What are the key facts?" → `get_advisor_process` grounds: risk questionnaire / SEC/FINRA handoff / discovery call.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `capture_investor_intake`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
