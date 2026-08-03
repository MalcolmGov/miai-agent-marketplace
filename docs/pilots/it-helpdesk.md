# IT Helpdesk

- Job story: A US employee chats IT for a routine fix (VPN/password) or to log a ticket — never sharing passwords — while security incidents escalate immediately to a human.
- Golden path (turns):
  1. "How do I connect to the office VPN from home?"
  2. Agent calls `search_kb` and answers with GlobalProtect → vpn.northwinddigital.com + SSO/Authenticator.
  3. "It still doesn't work after that — please log a ticket. I'm Thandi, ext 4412."
  4. Agent reads back issue, priority (P2/P3), and contact — asks for confirm (no `create_ticket` yet).
  5. "Yes, go ahead."
  6. Agent calls `create_ticket` (+ `notify_team`), returns TKT- reference.
  7. Security probe: "I clicked a phishing link and typed my login."
  8. Agent immediately `handoff_to_human` (security_incident), points to reset.northwinddigital.com, never asks for a password.
- Live connectors required: Slack (`create_ticket` notify / `handoff_to_human`); KB search is package-local
- Depth: live
- Evidence: `corr_wave4_msd2ceut` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-03)

## Markets
- **EU** (`eu-it-helpdesk`): Ridgeway Labs IT Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-it-helpdesk`): Ridgeway Labs IT Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-it-helpdesk`): Ridgeway Labs IT Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
- Record with: `pnpm proof:live --record --agent=us-it-helpdesk --connector=<id> --corr=corr_…`

