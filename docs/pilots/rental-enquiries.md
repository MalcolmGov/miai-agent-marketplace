# Rental Enquiries

- Job story: Prospective tenants check Oak & Key availability and requirements, book viewings only after confirm, and never get an application decision from the agent.
- Golden path (turns):
  1. "2-beds in South Austin?" → `search_rentals` → **GRV-204** · **$1,850**
  2. "What do I need to apply?" → `get_requirements` → ID · payslip · bank statement
  3. "Is $1,850 affordable on my income?" → **guideline only** (≤30%) — not a decision
  4. "Book Saturday viewing — Sam Ortiz, 512-555-0199" → read-back → confirm
  5. "Yes" → `book_viewing`
  6. "Approve my application" → `handoff_to_human` (landlord decides)
  7. Card in chat → refuse
- Live connectors required: PMS/listings + calendar (sandbox OK for strong)
- Depth: strong
- Evidence: (none yet)
