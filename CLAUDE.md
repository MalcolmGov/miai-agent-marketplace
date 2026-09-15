# Claude Code Agent Instructions & Recent Session State

> **Notice for Claude Code:** Read this file before making any edits or running deployments.
> This repository is a monorepo containing the **MyInstantAI White-Label Agent Marketplace**.
> We are deploying directly onto MyInstantAI's cloud infrastructure (Azure / Container Apps / Kubernetes), using their first-party OIDC auth, internal token wallet, payment webhooks, and private inference gateway.

---

## 1. What Was Just Completed (Session State — 15 September 2026)

> **Latest session state lives in [RESUME-2026-09-16.md](RESUME-2026-09-16.md)** — read it first.
>
> 15 Sept: PRs #182 + #183 merged and live in prod (`bb1839c`): fixed 6 broken flagship/suite
> agent links (soft-404s), Voice Studio two-way loop (full-utterance transcripts, adaptive
> endpointing, mic auto-restart, barge-in handover, de-personalized greetings, word-boundary
> intent matching), connector 401 → login redirects, and the `/catalogue/:id` login-gate bypass.
> Repo is now PUBLIC (history scanned clean). Open items: provider OAuth env vars in Railway,
> Takealot Copilot tools gap in the Zara backend, final handover acceptance pass.

### Archive: 12 September 2026 session

All changes have been fully implemented, verified, and tested with **100% test passing rate**:

### A. Mobile & Web Install Hub (`apps/web/src/components/InstallPanel.tsx`)
- **Visual Copy Button:** Created a dedicated `CodeSnippet` component with an interactive SVG clipboard button that toggles to `✓ Copied!` with tactile feedback.
- **Fixed Text Overlap Bug:** Replaced unconstrained inline tags in the WebViewGold and No-Code sections with contained code blocks using `break-words whitespace-pre-wrap overflow-x-auto`. Long query strings (`var webViewUrl = "http://..."`) now wrap cleanly without breaking card borders.
- **Multi-Framework Integration Code:** Fully wired for React Native / Expo, Flutter, Native iOS (SwiftUI WKWebView), Native Android (Jetpack Compose AndroidView), and No-Code (FlutterFlow, Bubble Mobile, WebViewGold).
- **Real-Time App Title & Color Sync:** Removed `disabled={!ready}` from App Title, Greeting, and Accent Color inputs. Customizations instantly reflect in the live generated App Link.

### B. PDF & Knowledge Document Ingestion (`apps/web/src/lib/ingest.ts`)
- **Mozilla PDF Engine:** Replaced the previous binary regex parsing with Mozilla's `pdfjs-dist` via `pdf-parse`.
- **Clean Document Text:** Uploaded invoices, price sheets, and policies now extract clean, multi-column markdown rather than corrupted binary character noise.

### C. UI & Agent Studio Refinement (`CatalogGrid.tsx`, `AgentStudio.tsx`)
- **Card Action Bar:** Updated agent cards with glowing gradient **"Setup"** action buttons and **"Details ↗"** modal triggers.
- **Decluttered Studio:** Removed redundant developer tools drawers; organized into a clean 5-step journey:
  `Knowledge` → `Connect Tools` → `Tokens` → `Sandbox Try` → `Install & Embed`.

### D. Authentication & B2B Onboarding (`apps/web/src/app/login/page.tsx`)
- **Credentials Auth:** Real work email + password authentication with PBKDF2 32-byte salt hashing.
- **Mock Bypass for Staging & CI:** Added automated mock sign-in form (`data-testid="mock-login-form"`, `login-username`, `login-password`, `login-submit`) so test runners and guest evaluators can bypass OIDC in mock mode.

### E. White-Label Handover Artifacts (`HANDOVER.md`, `white-label-handover.html`, `.pdf`)
- Created executive 5-page handover documentation for the MyInstantAI engineering team.
- **Sanitization Complete:** All mentions of external vendor names (e.g. Paystack) and personal names were stripped and replaced with generic first-party terminology (**MoveDigital Engineering Team** & **MyInstantAI First-Party Billing Rails**).
- Added dual presentation modes to `white-label-handover.html`: `@media screen` renders full-width centered executive view (up to 1200px max container), while `@media print` formats exact A4 pagination.
- Files generated in `docs/` and synced to `/Users/malcolmgovender/Documents/MyInstantAI-White-Label-Handover-2026-09-12/`.

---

## 2. Test Verification Scorecard (All Passing)

Do not deploy or commit if any of these fail:

```bash
# 1. Monorepo TypeScript check (0 errors across 8 packages)
pnpm typecheck

# 2. Web unit & security integration tests (309/309 passed)
pnpm test:web

# 3. Playwright End-to-End browser suite (83/83 passed)
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e

# 4. Market catalog SKU integrity check (500 agents / 100 families)
pnpm catalog:integrity
```

---

## 3. Deployment Architecture & Infrastructure Rules

We are deploying on **MyInstantAI's Infrastructure**:
- **Hosting:** Docker container (`apps/web` Next.js 14 App Router, Node 20+ LTS).
- **Authentication:** First-party OIDC (`MIAI_AUTH_MODE=oidc`, Keycloak/Auth0/Entra ID).
- **Token Wallet:** First-party HTTP wallet adapter (`MIAI_WALLET_MODE=http`, `WALLET_API_URL`).
- **Billing:** First-party billing gateway & HMAC-signed webhooks (`BILLING_WEBHOOK_URL`, `WEBHOOK_HMAC_SECRET`).
- **Persistence:** PostgreSQL (v15+ with SSL) + Redis (v7+).
- **Security:** Fail-closed boot guards (`security-flags.ts`); PAN scrubbing, prompt injection refusal, and cross-tenant isolation enabled.

---

## 4. Multi-Author Coordination Rules (Summary of `COORDINATION.md`)

- `main` is protected — do not push directly.
- Branch naming convention: `claude/<feature-name>`.
- Coordinate changes to shared catalog files (`data/catalog/index.json`, `spec/*`, `packages/*`).
- Always run `pnpm typecheck` and `pnpm test:web` before opening a pull request.
