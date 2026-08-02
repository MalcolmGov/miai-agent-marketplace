# ADR 0003: Postgres persistence with file fallback

**Status:** Accepted  
**Date:** 2026-08-02

## Context

Phase 0–1 stored rentals, audit events, OAuth tokens, and knowledge metadata in **process memory and JSON files**. That was fine for local dev and single-replica demos, but restarts and horizontal scale lose state without durable storage.

Phase 2 needed a **production-shaped persistence layer** without forcing Postgres for every contributor laptop or CI job.

## Decision

1. **Primary store:** When `DATABASE_URL` (or `MIAI_DATABASE_URL`) is set, the web app uses **Postgres** via `pg`, with versioned SQL migrations on boot (`apps/web/migrations/`).
2. **Tables** include at minimum: `miai_rentals`, `miai_audit`, `miai_turns`, `miai_oauth_tokens`, `miai_knowledge_sources`, and related workspace/lead stores (see [RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md)).
3. **File fallback:** When Postgres is unset or a write fails, the app falls back to **JSON file paths** (`RENTAL_STORE_PATH`, `OAUTH_TOKEN_STORE_PATH`, `KNOWLEDGE_STORE_PATH`, etc.) or in-memory structures for CI.
4. **No full-table wipes** — persistence uses row-level upserts; file fallback must not rewrite audit history when Postgres is primary.
5. **Local / CI default:** No `DATABASE_URL` → file/memory mode; `pnpm run ci` does not require a database container.

## Consequences

**Positive**

- One codebase path for dev, CI, staging (Railway Postgres), and Azure cutover.
- Demos can attach a volume at `/data` before Postgres is provisioned.
- Health endpoint can surface store backend and Postgres ping status.

**Negative / follow-ups**

- Dual-write / fallback paths add complexity; operators must prefer Postgres for multi-replica production.
- File fallback is not a substitute for backup, replication, or cross-region DR — document in runbooks.
- Connection pooling uses a process singleton; serverless cold starts need separate review if adopted.

## References

- [docs/RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md)
- [docs/TECHNICAL_SPEC.md](../TECHNICAL_SPEC.md)
- `apps/web/src/lib/store.ts`, `apps/web/src/lib/pg.ts`
