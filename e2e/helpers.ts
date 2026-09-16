import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const SMOKE_AGENT_ID = process.env.SMOKE_AGENT_ID || "us-customer-support";

export const INDEXED_MARKETS = ["africa", "asia", "eu", "oceania", "us"] as const;

/** Go-live 18 Cluster A heroes — studio shell matrix for handover. */
export const GOLIVE_HERO_AGENT_IDS = [
  "us-customer-support",
  "us-dental-front-desk",
  "us-home-services",
  "us-hotel-guest",
  "us-executive-assistant",
  "us-it-helpdesk",
] as const;

export async function postJsonWithRoles<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  roles: string,
): Promise<{ status: number; body: T }> {
  const res = await request.post(path, {
    data,
    headers: { "x-roles": roles },
  });
  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    body = {} as T;
  }
  return { status: res.status(), body };
}

export async function getJsonWithRoles<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  roles: string,
): Promise<{ status: number; body: T }> {
  const res = await request.get(path, { headers: { "x-roles": roles } });
  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    body = {} as T;
  }
  return { status: res.status(), body };
}

export async function getJson<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  headers?: Record<string, string>,
): Promise<{ status: number; body: T }> {
  const res = await request.get(path, { headers });
  const body = (await res.json()) as T;
  return { status: res.status(), body };
}

export async function postJson<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; body: T }> {
  const res = await request.post(path, { data, headers });
  let body: T;
  try {
    body = (await res.json()) as T;
  } catch {
    body = {} as T;
  }
  return { status: res.status(), body };
}

/** Health must not be failing; store must ping. */
export function assertHealthyStaging(body: Record<string, unknown>): void {
  expect(body.status, "health.status").not.toBe("failing");
  expect(["ok", "degraded"]).toContain(body.status);
  if (body.storePing != null) {
    expect(body.storePing, "storePing").toBe("ok");
  }
  if (body.store === "error") {
    throw new Error(`store hydrate error: ${String(body.storeError || "?")}`);
  }
}

/** Skip cookie banner so it doesn't intercept clicks / steal dialog role. */
export async function dismissConsent(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("miai_consent_v1", "essential");
    } catch {
      /* ignore */
    }
  });
}

export async function openCatalogue(page: Page): Promise<void> {
  await dismissConsent(page);
  // The catalogue grid (#catalogue) lives on the /agents hub — the homepage is the
  // dashboard since the B2B pivot, and /agents is the deliberately public browse
  // surface (see apps/web/src/lib/public-paths.ts).
  await page.goto("/agents");
  await expect(page.locator("#catalogue")).toBeVisible({ timeout: 30_000 });
}
