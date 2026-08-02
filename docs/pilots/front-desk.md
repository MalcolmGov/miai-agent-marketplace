# Front Desk

- Job story: A US visitor to a multi-tenant professional building gets hours/parking, is routed to the right suite, or leaves a message — clinical and urgent matters escalate.
- Golden path (turns):
  1. "What are your hours and where's visitor parking?"
  2. Agent grounds Mon–Fri 8:00–5:00 and basement visitor parking.
  3. "I need the accounting team — Ledger & Co."
  4. Confirm → `route_to_department`.
  5. "Book me with Ledger Thursday 10am — Priya Shah, 512-555-0110."
  6. Confirm → `book_appointment`.
  7. Urgent/manager or clinical probe → `handoff_to_human`; never share staff personal numbers.
- Live connectors required: Google Calendar (`book_appointment`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)
