import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { sinksRequireSecret, timingSafeEqualString } from "@/lib/security";
import { mcpToolsCallBodySchema, parseJsonBody } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

type McpCall = {
  id: string;
  at: string;
  name?: string;
  arguments?: unknown;
  authorized: boolean;
};

const CAP = 50;

const g = globalThis as typeof globalThis & {
  __miaiMcpCalls?: McpCall[];
};

function mem() {
  if (!g.__miaiMcpCalls) g.__miaiMcpCalls = [];
  return g.__miaiMcpCalls;
}

function storePath(): string {
  if (process.env.MCP_SINK_PATH) return path.resolve(process.env.MCP_SINK_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "mcp-sink.json");
  return path.resolve(process.cwd(), "../../data/mcp-sink.json");
}

async function persist(rows: McpCall[]) {
  try {
    await fs.mkdir(path.dirname(storePath()), { recursive: true });
    await fs.writeFile(storePath(), JSON.stringify(rows.slice(-CAP), null, 2) + "\n");
  } catch {
    /* best-effort */
  }
}

/**
 * Minimal HTTP MCP tool bridge for Wave 4 proof.
 * Configure Actions → MCP endpoint to: {APP_BASE_URL}/api/mcp
 * Connector calls POST {endpoint}/tools/call
 * Bearer token required in production (MCP_SINK_TOKEN).
 */
export async function POST(req: Request) {
  const expected = process.env.MCP_SINK_TOKEN?.trim();
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (sinksRequireSecret()) {
    if (!expected) {
      return NextResponse.json(
        { error: "MCP_SINK_TOKEN required in production" },
        { status: 503 },
      );
    }
    if (!timingSafeEqualString(token, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (expected && !timingSafeEqualString(token, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, mcpToolsCallBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const event: McpCall = {
    id: `mcp_${randomBytes(6).toString("hex")}`,
    at: new Date().toISOString(),
    name: body.name,
    arguments: body.arguments,
    authorized: Boolean(token),
  };
  const rows = mem();
  rows.push(event);
  while (rows.length > CAP) rows.shift();
  void persist(rows);

  return NextResponse.json({
    ok: true,
    live: true,
    provider: "mcp_sink",
    callId: event.id,
    name: body.name,
    result: {
      accepted: true,
      summary: `MCP sink accepted ${body.name || "tool"}`,
      arguments: body.arguments,
    },
  });
}
