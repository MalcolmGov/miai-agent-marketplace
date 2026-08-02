# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public GitHub issue for exploitable findings.

| Channel | Use when |
|---|---|
| **Email** | [security@myinstantai.com](mailto:security@myinstantai.com) |
| **GitHub** | [Private security advisory](https://github.com/myinstantai/miai-agent-marketplace/security/advisories/new) on this repository (preferred if you already have repo access) |

Include: affected component, reproduction steps, impact assessment, and any suggested fix. We appreciate responsible disclosure.

## Scope

**In scope**

- This marketplace and agent runtime repository: auth, tenancy, OAuth token handling, embed keys, API routes, connector admin, wallet adapter integration, Postgres/file stores, boot hardening, and platform guardrails.
- Supply-chain issues in declared dependencies when they affect this codebase's deployment surface.

**Out of scope**

- **Customer LLM prompts and tenant knowledge** uploaded at runtime — tenants control their content; report abuse to the workspace owner or MyInstantAI support, not as a platform CVE unless the platform fails to isolate tenants.
- Third-party IdPs, payment processors, and model providers (report to those vendors directly; tell us if a misconfiguration in our integration is the root cause).
- Social engineering, denial-of-service at scale, or issues in unreleased / forked deployments without our default hardening.

## Response SLA (draft)

These targets apply to **confirmed in-scope vulnerabilities** in maintained release branches. They are goals, not contractual SLAs.

| Severity | Definition (summary) | Target response | Target fix / mitigation |
|---|---|---|---|
| **Critical** | Unauthenticated RCE, cross-tenant data leak, auth bypass in production config | **24 hours** acknowledge | **7 days** patch or documented workaround |
| **High** | Privilege escalation, OAuth/token theft path, persistent XSS in marketplace UI | **3 business days** acknowledge | **30 days** patch |
| **Medium / Low** | Defense-in-depth gaps, staging-only issues, informational hardening | **10 business days** acknowledge | Best-effort in next release |

We will keep reporters informed of status. Coordinated disclosure is welcome; we ask for **90 days** before public detail unless a fix ships sooner.

## Supported versions

Security fixes target the **`main` branch** and the latest tagged release (when present). Older snapshots are not guaranteed support.

## Safe harbour

We support good-faith research that follows this policy and avoids privacy violations, service disruption, or data exfiltration beyond what is needed to demonstrate impact.
