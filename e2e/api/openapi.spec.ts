import { test, expect } from "@playwright/test";
import { getJson } from "../helpers";

test.describe("OpenAPI stub @smoke @handover", () => {
  test("GET /api/v1/openapi is OpenAPI 3 with key paths", async ({ request }) => {
    const { status, body } = await getJson<{
      openapi?: string;
      paths?: Record<string, unknown>;
      components?: { securitySchemes?: Record<string, unknown> };
    }>(request, "/api/v1/openapi");
    expect(status).toBe(200);
    expect(body.openapi || "").toMatch(/^3\./);
    expect(body.paths).toBeTruthy();
    const paths = Object.keys(body.paths || {});
    expect(paths.some((p) => /embed\/chat|rent/i.test(p))).toBeTruthy();
  });
});
