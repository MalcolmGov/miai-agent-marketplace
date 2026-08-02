import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const SMOKE_AGENT_ID = process.env.SMOKE_AGENT_ID || "us-customer-support";

export const INDEXED_MARKETS = ["africa", "asia", "eu", "oceania", "us"] as const;

export async function getJson<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; body: T }> {
  const res = await request.get(path);
  const body = (await res.json()) as T;
  return { status: res.status(), body };
}

export async function postJson<T = Record<string, unknown>>(
  request: APIRequestContext,
  path: string,
  data: unknown,
): Promise<{ status: number; body: T }> {
  const res = await request.post(path, { data });
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

export async function openCatalogue(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#catalogue")).toBeVisible({ timeout: 30_000 });
}
