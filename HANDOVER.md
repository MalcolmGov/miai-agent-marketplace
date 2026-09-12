# MyInstantAI Technical Handover & Architecture Runbook

> **Target Audience:** MyInstantAI Engineering & DevOps Team  
> **Status:** Production-Ready · Verified & Tested  
> **Repository:** `miai-agent-marketplace` (Monorepo: Next.js Web App, Connectors, Runtime, Presets)

---

## 1. System Architecture Overview

The MyInstantAI platform is designed around zero-hallucination agent execution, strict multi-tenant isolation, enterprise secret protection, and plug-and-play website embedding.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT EMBED / WEB BROWSER                         │
│                                                                             │
│  • Floating Chat Bubble: <script src="/agents/v1/agent.js" data-key="...">  │
│  • Agent Studio & Marketplace Portal: Next.js 14+ (App Router)              │
│  • Live WebRTC & Fast Inference Engine                                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / WSS
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    MYINSTANT.AI PLATFORM CORE (apps/web)                    │
│                                                                             │
│  • Route Handlers: /api/chat, /api/oauth/*, /api/connectors/*, /api/ops    │
│  • Security Gateways: SSRF protection, token encryption, PBKDF2 salts       │
│  • Dynamic Knowledge & Optimal Setup: 150 Business Problem Blueprints       │
│  • Public CDN Assets: /icons/connectors/* (theSVG.org official brand SVGs)  │
└──────────────────┬───────────────────┬───────────────────┬──────────────────┘
                   │                   │                   │
         ┌─────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
         │ @miai/connectors │ │  @miai/runtime  │ │  @miai/presets  │
         │ OAuth & API Keys │ │ Agent Inference │ │ Domain Blueprints│
         │ Preflight Checks │ │ Context & Eval  │ │ Tool Definitions│
         └──────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. Verified User Journey (5-Step Pipeline)

Every agent in the marketplace is pre-configured and guided through a linear 5-step journey in [`apps/web/src/components/AgentStudio.tsx`](apps/web/src/components/AgentStudio.tsx):

1. **Step 1: Knowledge & Guidelines (`/agents/[id]?step=knowledge`)**
   - Clean, full-width textarea automatically sanitized of internal eval grounding tokens.
   - Interactive **Optimal Setup Guide** showing target problems, required inputs, and operational boundaries mapped to the 10 business problem areas.
2. **Step 2: Connect Tools (`/agents/[id]?step=connect`)**
   - High-contrast, executive bento integration cards featuring official brand SVGs (HubSpot, Google Calendar, Slack, WhatsApp, Stripe, Zendesk, etc.).
   - Clean configuration modals with 1-click **Sandbox Demo Simulation** so users can test immediately without live credentials.
   - Advanced developer protocols (MCP bridge & Webhooks) neatly grouped in a collapsible drawer.
3. **Step 3: Free Activation & Token Top-Up (`/agents/[id]?step=tokens`)**
   - Free workspace registration and embed key allocation.
   - Prepaid token model with first-party billing checkout integration ($5 to $200 tiers).
4. **Step 4: Interactive Sandbox Chat (`/agents/[id]?step=try`)**
   - Safe simulated tool calling (e.g. `list_courses`, `capture_interest`, `schedule_meeting`).
   - 4 Live Guardrail probes for immediate safety verification:
     - **Prompt Injection Refusal**
     - **Cross-Tenant Data Exfiltration Refusal**
     - **PCI-DSS Credit Card (PAN) Write-Scrubbing**
     - **Emergency / 911 Human Routing Escalation**
   - Multi-language response selector (English, Zulu, Afrikaans, French, Spanish, etc.).
5. **Step 5: 1-Line Embed & Install Hub (`/agents/[id]?step=install`)**
   - Reasoning engine selector (Gemini Flash, GPT-4o Mini, Claude Sonnet, Claude Opus).
   - Instant 1-line `<script>` embed tag with SRI hash protection.
   - Visual installation guides for WordPress, Shopify, Webflow, Wix/Squarespace, and React/HTML.
   - Domain-origin security locking to prevent unauthorized embed theft.

---

## 3. Key Services & Components Directory

| Area | Key Files | Functionality |
|---|---|---|
| **Agent Studio** | `apps/web/src/components/AgentStudio.tsx` | Master coordinator for the 5-step deployment flow |
| **Integrations Hub** | `apps/web/src/components/ActionsPanel.tsx`<br>`apps/web/src/lib/connector-icons.ts` | Connector cards, official SVGs, credential modals, sandbox toggle |
| **Embed Widget** | `apps/web/src/app/agents/v1/agent.js/route.ts`<br>`apps/web/src/lib/agent-js-script.ts` | Ultra-lightweight (~12KB) vanilla JS shadow-DOM chat widget |
| **Chat Engine** | `apps/web/src/app/api/chat/route.ts`<br>`apps/web/src/components/SandboxChat.tsx` | Inference pipeline, tool execution, guardrail refusal triggers |
| **Ops & Telemetry** | `apps/web/src/app/ops/page.tsx`<br>`apps/web/src/app/api/ops/route.ts` | Live health monitoring, token usage metrics, audit events stream |
| **Problem Blueprints** | `apps/web/src/lib/knowledge-guidance.ts` | Mapping agents to the "150 Business Problems" framework |

---

## 4. Environment Variables & Production Checklist

Before deploying to staging or production, ensure the following environment keys are set:

```bash
# Application
NODE_ENV=production
PUBLIC_URL=https://myinstantai.digital

# Database & Persistence
DATABASE_URL=postgresql://user:password@host:5432/miai_prod?sslmode=require

# Encryption & Session Security (Min 32 characters random hex)
OAUTH_TOKEN_SECRET=your-secure-random-32-byte-hex-string
OAUTH_STATE_SECRET=your-secure-random-32-byte-hex-string
EMBED_KEY_SECRET=your-secure-random-32-byte-hex-string

# AI Model Gateways
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Payments & Tokens
BILLING_WEBHOOK_URL=https://billing.myinstantai.internal/webhook
WEBHOOK_HMAC_SECRET=sec_hmac_sha256_...

# OAuth Vendor Credentials (Optional per integration)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
```

---

## 5. Verification & Test Commands

To verify code integrity and pass all CI checks:

```bash
# 1. Typecheck entire web application
pnpm --filter @miai/web typecheck

# 2. Run all unit & security integration tests (309 passing tests)
pnpm test:web

# 3. Compile full production build
pnpm build:web
```

---

## 6. Live Local Verification URLs

| Surface | URL | What to verify |
|---|---|---|
| **Marketplace Home** | `http://localhost:3000/` | 3D Hero, category filter, bento agent cards |
| **Connectors (Step 2)** | `http://localhost:3000/agents/us-course-advisor?step=connect` | theSVG.org brand logos, clean cards, modals |
| **Sandbox Chat (Step 4)** | `http://localhost:3000/agents/us-course-advisor?step=try` | Live simulated tools, guardrail probe chips |
| **Embed & Install (Step 5)** | `http://localhost:3000/agents/us-course-advisor?step=install` | Script embed tag, CMS guides (WordPress/Shopify) |
| **Ops Dashboard** | `http://localhost:3000/ops` | Live turns, token balance, agent fleet telemetry |
