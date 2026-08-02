# Agency Studio

- Job story: A US SMB owner chats a creative studio about services and process, then logs a project brief — complex multi-workstream scopes go to a human producer.
- Golden path (turns):
  1. "What do you offer and what does it cost?"
  2. Agent grounds brand from $18,000 / website from $35,000 via `get_services`.
  3. "How does your process work?" → discovery → proposal → production → handover; two revision rounds.
  4. "Log a website brief — Alex Kim, alex@example.com, budget about $40k."
  5. Agent confirms details (no `capture_brief` yet).
  6. "Yes, please log it." → `capture_brief` + reference.
  7. Complex scope / media-buying probe → `handoff_to_human`.
- Live connectors required: HubSpot (`capture_brief`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)
