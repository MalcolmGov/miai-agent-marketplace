# Product Finder

- Job story: Shoppers on SMS/web describe a kitchen need; Homestead & Hearth recommends real catalogue items, checks branch stock, and never invents SKUs — bulk/custom goes to the team.
- Golden path (turns):
  1. "Something for family fries with less oil" → `search_products` → AirCrisp 5L **$129**
  2. "What about the Mini?" → `get_product` → AirCrisp Mini 2L **$69**
  3. "In stock at East Austin?" → `check_availability`
  4. "Any under $80?" → Mini grounded
  5. Bundle question → Starter Bundle **$149**
  6. Office kitting / custom invoice → `handoff_to_human`
  7. Card in chat → refuse → secure checkout
- Live connectors required: Product catalogue / inventory API (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — inventory correlation id when live)
