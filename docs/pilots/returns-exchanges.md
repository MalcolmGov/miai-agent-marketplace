# Returns & Exchanges

- Job story: Homestead & Hearth customers check return eligibility, start a return only after confirm, and get refund/faulty cases to the human desk — agent never pays out refunds.
- Golden path (turns):
  1. "Can I return order HH-4412?" → `check_return_eligibility`
  2. "What's the window?" → **30 days** unused
  3. "Start a prepaid-label return — reason: wrong size" → read-back → confirm
  4. "Yes" → `start_return` → reference
  5. "Where's my refund?" → inspect **5–7 business days** · original payment · or status tool / handoff
  6. Faulty item / clearance dispute → `handoff_to_human`
  7. Card in chat → refuse
- Live connectors required: OMS / returns platform (sandbox OK for strong)
- Depth: strong
- Evidence: (none yet)
