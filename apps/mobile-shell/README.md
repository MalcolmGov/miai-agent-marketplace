# MIAI mobile shell (Expo)

Thin iOS/Android **WebView** that loads the hosted App channel (`/app/v1`). Demo / UAT only — not an App Store SDK.

## Setup

```bash
# from repo root — start marketplace
pnpm dev

# in another terminal
cd apps/mobile-shell
cp .env.example .env
# paste a live mia_pk_… key from Studio → Install → App
pnpm install
pnpm start
```

Or from repo root: `pnpm demo:app`.

Press `i` (iOS Simulator) or `a` (Android emulator).

## Staging

```env
EXPO_PUBLIC_APP_CHAT_URL=https://miaiweb-production.up.railway.app/app/v1
EXPO_PUBLIC_EMBED_KEY=mia_pk_…
```

## Notes

- The shell has **no** marketplace chrome — only the WebView.
- Keyboard / safe-area polish lives in the hosted page (`docs/APP_CHANNEL.md`).
- For physical devices, use your machine LAN IP instead of `127.0.0.1`.
