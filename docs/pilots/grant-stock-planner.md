# Grant Stock Planner

- Job story: A US convenience-store owner plans benefit-week (SNAP/SSI) staples, builds a pre-stock list, and places a supplier reorder only after confirmation.
- Golden path (turns):
  1. "When is grant week this month?" → 3rd–7th benefit spike grounded.
  2. "Forecast staples for grant week." → `get_demand_forecast`.
  3. "Build a pre-stock list under $2,000." → `build_prestock_list`.
  4. "Reorder 40 cases of rice."
  5. Confirm item + qty — no `place_reorder` yet.
  6. "Yes, place it." → `place_reorder`.
  7. Supplier credit-hold / budget approval → `handoff_to_human`.
- Live connectors required: Shopify (`build_prestock_list` / `place_reorder`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)
