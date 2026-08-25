# Sandbox evaluation environment

An isolated, cost-capped copy of the running platform for a partner's technical team to
**test, integrate and evaluate** — without touching production, without billing real money,
and **without giving them the source repo**. It is the "give my team access" answer that
keeps the code (and the agent library) yours.

Turn it on with **`SANDBOX_MODE=1`** on a **separate deployment** with its **own database and
keys**. The sandbox lives on **your** infrastructure (you keep the logs and the kill switch);
only the eventual *production* deployment moves to the partner's cloud.

## What sandbox mode does (in code)

| Guard | Behaviour |
|---|---|
| **Mock rails allowed** | `SANDBOX_MODE=1` satisfies the production mock-rails acknowledgement, so mock auth + mock wallet work with no dual flags. |
| **Live connectors killed** | `executeConnector` force-stubs every call (Slack, email, WhatsApp, Stripe, webhooks, MCP…) regardless of caller — no real sends or writes, even though some turn paths hard-code `live`. |
| **Model spend capped** | `createModelAdapter` falls back to the mock model after `SANDBOX_MODEL_TURN_CAP` real-provider turns per process. |
| **Payments disabled** | The Paystack top-up route returns `503`; top-ups use the free mock credit. |
| **IP redacted** | `/api/agents/[id]` strips `system_prompt`, `guardrails` and `evals` from the package sent to the client, so the agent library can't be bulk-scraped. Agents still run server-side with the full package. |
| **Clearly labelled** | A persistent SANDBOX banner is shown on every page. |

Config-level guards (set via env, not code): leave `PAYSTACK_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`
and `CRON_SECRET` **unset**, and connect **no real** OAuth/API tokens in the sandbox workspace.

## Stand it up (≈15 min, your infra)

No external database is needed — this app stores state as JSON files on a Railway **volume**, and the agents are baked into the image.

1. **New Railway service** — deploy this repo's `Dockerfile` as a **second service** (not the production one). Give it its **own volume mounted at `/data`** — a separate service means separate storage, so it's isolated from production automatically. *(Optional: to use Postgres instead, add a Railway Postgres service and set `DATABASE_URL`.)*
2. **Public domain** — under the service's Networking settings, generate a domain — that's the sandbox URL.
3. **Env** — copy `apps/web/.env.sandbox.example` into the service's variables: set `SANDBOX_MODE=1`, `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL` to the sandbox URL, and a fresh `OAUTH_TOKEN_SECRET`. Keep `MIAI_MODEL_MODE=mock` for zero cost, **or** set `openai` + a **separate, hard-capped** key to judge real agent quality. (The Dockerfile already sets the `/data` store paths and mock modes.)
4. **Deploy** and open the URL — you should see the SANDBOX banner and be able to log in with no account (mock auth).
5. **Smoke-check**: browse the catalogue, open an agent → **Set up**, chat with it, top up with the free demo credit, and confirm connector actions come back **stubbed**.

## Give the partner access

- Send them the **sandbox URL** — mock auth means their engineers are in instantly, no accounts.
- Add named demo members via `MIAI_MOCK_ROLES` or the members store if you want individual identities.
- For API/integration testing, point them at the sandbox's `/api/v1/openapi` and issue sandbox API keys.
- **Log** their activity (it's your infra) and set a **teardown date** — delete the service + Neon branch when the evaluation ends.

## What they get vs. what stays yours

- **They get:** the full running product to test, integrate against, and break; confidence it works.
- **They never get:** the source repo, the CI/CD, the build, or the raw agent prompts/guardrails/evals.

This is the blueprint boundary in practice — *artifacts and running services cross; source and IP do not.*
