import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sinksRequireSecret } from "@/lib/security";

export const dynamic = "force-dynamic";

type McpCall = {
  id: string;
  at: string;
  name?: string;
  arguments?: unknown;
  authorized: boolean;
};

const g = globalThis as typeof globalThis & {
  __miaiMcpCalls?: McpCall[];
};

function storePath(): string {
  if (process.env.MCP_SINK_PATH) return path.resolve(process.env.MCP_SINK_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "mcp-sink.json");
  return path.resolve(process.cwd(), "../../data/mcp-sink.json");
}

function authorizeMcpInspect(req: Request): NextResponse | null {
  if (!sinksRequireSecret()) return null;
  const expected = process.env.MCP_SINK_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "MCP_SINK_TOKEN required in production" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const token = bearer || new URL(req.url).searchParams.get("token") || "";
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Health + inspect recent MCP tool calls — gated in production. */
export async function GET(req: Request) {
  const denied = authorizeMcpInspect(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const limit = Math.min(20, Number(url.searchParams.get("limit") || 10) || 10);
  let rows = [...(g.__miaiMcpCalls ?? [])];
  if (rows.length === 0) {
    try {
      const raw = await fs.readFile(storePath(), "utf8");
      rows = JSON.parse(raw) as McpCall[];
      g.__miaiMcpCalls = rows;
    } catch {
      rows = [];
    }
  }
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mcp",
    toolsCall: "/api/mcp/tools/call",
    count: rows.length,
    calls: rows.slice(-limit).reverse(),
  });
}
