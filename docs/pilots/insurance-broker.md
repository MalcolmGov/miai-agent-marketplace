# Insurance Broker

- Job story: Prospects on SMS/web get plain-language cover options and an indicative needs analysis, then submit clean underwriter packs — the agent never advises or binds a quote.
- Golden path (turns):
  1. "What does comprehensive car cover include?" → get_cover_options
  2. "I have a 2021 Honda Civic, locked garage, accident & theft." → needs_analysis (indicative)
  3. "Worth about $25,000 — I'm the only driver." → reflect indicative scope
  4. "Send my details to the underwriter — Alex Rivera, 512-555-0144." → confirm read-back
  5. "Yes, go ahead." → capture_submission (reference; quote in 2 business days)
  6. "Which should I buy / exact premium?" → refuse advice / binding quote → handoff_to_human
  7. Excess / funeral waiting period from knowledge ($3,500 · 6 months); card in chat → refuse
- Live connectors required: Broker CRM / underwriter submission queue (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)
