# Consumer sign-in (per-person memory) — "Sign in with Google"

By default the consumer line runs on **mock auth**: everyone is `demo-user`, so a person's memory
(preferences, goals, people) is shared. Turning on **OIDC** makes each person sign in with Google,
so memory is keyed to their real, verified identity and stays private to them.

This is a self-contained **Authorization Code + PKCE** flow with a signed, HttpOnly **session
cookie** — no third-party SDK. It's gated behind `MIAI_AUTH_MODE=oidc` + the credentials below, so
until you set those, nothing changes.

## What happens at runtime

1. A signed-out person on `/me` or a specialist page sees a **Sign in with Google** card (the
   chat/assistant doesn't mount, so no authenticated calls fire).
2. `→ /api/consumer/auth/login` mints PKCE + a CSRF `state` + an OIDC `nonce` (stored in a
   short-lived signed cookie) and redirects to Google.
3. Google redirects back to `→ /api/consumer/auth/callback`, which validates `state`, exchanges the
   code, verifies the `id_token` (issuer, audience, `nonce`, signature) and sets a signed session
   cookie (`userId = Google sub`).
4. Consumer API routes resolve identity from that cookie (`resolveConsumerAuth`); the memory owner
   becomes `(brand, google-sub)`. `/api/consumer/auth/logout` clears it.

## One-time Google Cloud Console setup

1. **Create/select a project** at <https://console.cloud.google.com>.
2. **OAuth consent screen** → User type **External** → app name, support email, and the
   **`openid`, `email`, `profile`** scopes. While the app is in *Testing*, only **added test users**
   can sign in — fine for the sandbox/eval; **Publish** (and complete verification) before a public
   consumer launch.
3. **Credentials → Create credentials → OAuth client ID → Web application.**
4. **Authorized redirect URIs** — add one per deployment (exact match, https):
   - Sandbox: `https://miaiweb-production-f4cb.up.railway.app/api/consumer/auth/callback`
   - Production: `https://miaiweb-production.up.railway.app/api/consumer/auth/callback`
   - Any custom domain: `https://<your-domain>/api/consumer/auth/callback`
5. Copy the **Client ID** and **Client secret**.

## Railway env vars (set on each service — sandbox and production)

| Variable | Value |
|---|---|
| `MIAI_AUTH_MODE` | `oidc` |
| `MIAI_OIDC_ISSUER` | `https://accounts.google.com` |
| `GOOGLE_OAUTH_CLIENT_ID` | *(from step 5)* |
| `GOOGLE_OAUTH_CLIENT_SECRET` | *(from step 5)* |
| `MIAI_SESSION_SECRET` | a strong random string (≥32 chars) for signing the session cookie. If unset, `OAUTH_TOKEN_SECRET` is used. |
| `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` | the service's public URL — used to build the redirect URI. Must match a URI registered in step 4. |

Redirect URI is derived as `${APP_BASE_URL}/api/consumer/auth/callback`, so `APP_BASE_URL` and the
Google-registered URI must agree exactly.

## Notes

- **B2B is unchanged.** The Agents console keeps its own external-IdP Bearer flow (`resolveAuth`,
  `agents-auth`). This is a separate, consumer-only session model.
- **Turning it off:** set `MIAI_AUTH_MODE=mock` and the consumer line returns to the frictionless
  shared-demo mode.
- **Memory tenant:** `userId = Google sub`; the tenant stays the brand (`?workspaceId=`/default), so
  memory is per-brand, per-person. Existing shared `demo-user` memory is separate and untouched.
