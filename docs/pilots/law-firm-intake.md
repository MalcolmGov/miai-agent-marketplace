# Law Firm Intake

- Job story: Prospective clients on SMS/web learn practice areas, complete conflict-aware intake, and book a consult — the agent never gives legal advice.
- Golden path (turns):
  1. "What areas of law do you handle?" → get_practice_areas
  2. Conflict / confidentiality note before matter details
  3. "I'm Jordan Lee, 512-555-0199 — employment dismissal last week." → confirm → capture_intake
  4. "Book consult next Wednesday 10:00." → confirm → book_consultation ($150 / 45 min)
  5. "Do I have a strong case?" → refuse advice → attorney / handoff
  6. Eviction / court this week → urgent handoff (+ 211 / Legal Aid referral)
  7. Criminal defense request → refer out; card in chat → refuse
- Live connectors required: Practice management / calendar (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)
