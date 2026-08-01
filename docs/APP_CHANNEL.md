# App channel — hosted mobile chat + Expo shell

Deploy path for the catalogue **`app`** channel: a hosted, WebView-ready messenger (not the marketplace UI).

## Product loop

1. Rent agent → go **Live** in Agent Studio  
2. **Install → App channel** — set title / accents / greeting  
3. Copy App URL or open preview  
4. Load URL full-screen in WKWebView / Android WebView / Expo shell  

Same publishable key (`mia_pk_…`) as the website embed.

## Hosted URL

```
{APP_BASE_URL}/app/v1?key={mia_pk_…}&title=Assistant&accent=%232bb8a8&accent2=%23157f8d&greeting=…
```

| Param | Required | Default |
|---|---|---|
| `key` | yes | — |
| `title` | no | `Assistant` |
| `accent` | no | `#2bb8a8` |
| `accent2` | no | `#157f8d` |
| `greeting` | no | short default |
| `suggestions` | no | comma-separated chips |
| `lang` | no | `en` |

Page strips marketplace chrome (no sidebar / topbar). Designed for **zero browser URL bar**.

## Chat API (SSE)

`POST /api/app/chat`

```json
{ "key": "mia_pk_…", "message": "Hello", "sessionId": "app_…", "replyLanguage": "en" }
```

Default: `text/event-stream` with **live model token deltas** (`MIAI_MODEL_MODE=openai|gateway`). Mock mode paces after generate.

| Event | Payload |
|---|---|
| `meta` | `{ channel, streaming }` |
| `delta` | `{ text }` — tokens as the model produces them |
| `status` | `{ phase: "tool" }` — reset partial bubble; tool round started |
| `paused` | wallet empty |
| `done` | `{ reply, paused, balance }` |
| `error` | `{ error, detail, status }` |

JSON one-shot: `Accept: application/json`.

Public under OIDC mode (same as embed): middleware allowlists `/api/app/`.

## WebView checklist

**Feel (must pass):**

- [ ] No marketplace nav  
- [ ] Safe-area insets (notch / home indicator)  
- [ ] Soft keyboard does not cover composer (`visualViewport`)  
- [ ] Input at 16px (no iOS focus zoom)  
- [ ] Assistant reply streams into bubble  
- [ ] Overscroll contained; feels like messenger, not a website  

**iOS WKWebView:** `isOpaque = false`; `scrollView.contentInsetAdjustmentBehavior = .never`; disable pinch zoom.  

**Android WebView:** DOM storage on; disable zoom; activity `windowSoftInputMode=adjustResize`.

## Expo demo shell

```bash
cd apps/mobile-shell
cp .env.example .env   # set EXPO_PUBLIC_APP_CHAT_URL + key
pnpm install
pnpm start             # or: pnpm --dir ../.. demo:app
```

Open iOS Simulator / Android emulator. The shell is a full-screen WebView only.

## Related

- Website embed: `/agents/v1/agent.js` + `POST /api/embed/chat`  
- Shared turn helper: `apps/web/src/lib/channel-turn.ts`  
- Platform contract: [PLATFORM_INTEGRATION.md](./PLATFORM_INTEGRATION.md)
