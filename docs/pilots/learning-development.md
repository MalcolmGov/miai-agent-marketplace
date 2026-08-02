# Learning & Development

- Job story: Course catalogue FAQ and learning enrollment logging; never invent completions (Northwind People L&D / Round Rock, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_learning_courses` / knowledge.
  2. Customer asks to proceed with course enrollment.
  3. Agent reads back details; customer says yes → `enroll_in_course` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: HR & internal ops

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
