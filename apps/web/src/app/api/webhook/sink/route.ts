import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { verifyWebhookSignature } from "@miai/connectors";
import { sinksRequireSecret, timingSafeEqualString } from "@/lib/security";
import { webhookSinkAllowLegacyRawSecret } from "@/lib/webhook-sink-auth";

export const dynamic = "force-dynamic";

type SinkEvent = {
  id: string;
  at: string;
  signature?: string | null;
  payload: unknown;
};

const CAP = 50;

const g = globalThis as typeof globalThis & {
  __miaiWebhookSink?: SinkEvent[];
};

function mem() {
  if (!g.__miaiWebhookSink) g.__miaiWebhookSink = [];
  return g.__miaiWebhookSink;
}

function storePath(): string {
  if (process.env.WEBHOOK_SINK_PATH) return path.resolve(process.env.WEBHOOK_SINK_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "webhook-sink.json");
  return path.resolve(process.cwd(), "../../data/webhook-sink.json");
}

async function persist(rows: SinkEvent[]) {
  try {
    await fs.mkdir(path.dirname(storePath()), { recursive: true });
    await fs.writeFile(storePath(), JSON.stringify(rows.slice(-CAP), null, 2) + "\n");
  } catch {
    /* best-effort */
  }
}

function authorizeInspect(req: Request): NextResponse | null {
  if (!sinksRequireSecret()) return null;
  const expected = process.env.WEBHOOK_SINK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "WEBHOOK_SINK_SECRET required in production" },
      { status: 503 },
    );
  }
  const token =
    req.headers.get("x-miai-signature") ||
    new URL(req.url).searchParams.get("token") ||
    "";
  if (!timingSafeEqualString(token, expected)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  return null;
}

/**
 * Wave 4 proof sink — receives connector webhook POSTs.
 * Configure Actions → Webhook URL to:
 *   {APP_BASE_URL}/api/webhook/sink
 *
 * Prefers HMAC: x-miai-signature: v1=<hex>, x-miai-timestamp: <ms>
 * Legacy raw shared secret accepted unless WEBHOOK_SINK_HMAC_ONLY=1.
 */
export async function POST(req: Request) {
  const expected = process.env.WEBHOOK_SINK_SECRET?.trim();
  const rawBody = await req.text();
  const signature = req.headers.get("x-miai-signature") || "";
  const timestamp = req.headers.get("x-miai-timestamp");
  const allowLegacyRawSecret = webhookSinkAllowLegacyRawSecret();

  if (sinksRequireSecret()) {
    if (!expected) {
      return NextResponse.json(
        { error: "WEBHOOK_SINK_SECRET required in production" },
        { status: 503 },
      );
    }
    if (
      !verifyWebhookSignature({
        secret: expected,
        signature,
        timestamp,
        body: rawBody,
        allowLegacyRawSecret,
      })
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (expected) {
    if (
      !verifyWebhookSignature({
        secret: expected,
        signature,
        timestamp,
        body: rawBody,
        allowLegacyRawSecret,
      })
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { raw: rawBody };
  }

  const event: SinkEvent = {
    id: `wh_${randomBytes(6).toString("hex")}`,
    at: new Date().toISOString(),
    signature: signature ? (signature.startsWith("v1=") ? "hmac-v1" : "present") : null,
    payload,
  };
  const rows = mem();
  rows.push(event);
  while (rows.length > CAP) rows.shift();
  void persist(rows);

  return NextResponse.json({
    ok: true,
    received: true,
    live: true,
    provider: "webhook_sink",
    eventId: event.id,
    tool: (payload as { tool?: string }).tool,
  });
}

/** Inspect recent sink events — requires secret in production. */
export async function GET(req: Request) {
  const denied = authorizeInspect(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const limit = Math.min(20, Number(url.searchParams.get("limit") || 10) || 10);
  let rows = [...mem()];
  if (rows.length === 0) {
    try {
      const raw = await fs.readFile(storePath(), "utf8");
      rows = JSON.parse(raw) as SinkEvent[];
      g.__miaiWebhookSink = rows;
    } catch {
      rows = [];
    }
  }
  return NextResponse.json({
    count: rows.length,
    events: rows.slice(-limit).reverse(),
  });
}
