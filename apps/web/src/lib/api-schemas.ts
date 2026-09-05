import { z } from "zod";

const id = z.string().min(1).max(200);
const shortText = z.string().max(200);
const message = z.string().min(1).max(8000);
const optionalMessage = z.string().max(8000).optional();
const longText = z.string().max(100_000);

export const studioChatBodySchema = z.object({
  agentId: id,
  message: optionalMessage,
  workspaceId: shortText.optional(),
  mode: z.enum(["sandbox", "live"]).optional(),
  clear: z.boolean().optional(),
  replyLanguage: z.string().max(32).optional(),
  correlationId: shortText.optional(),
  sessionId: shortText.optional(),
});

export const channelChatBodySchema = z.object({
  key: z.string().min(1).max(512),
  message,
  sessionId: shortText.optional(),
  replyLanguage: z.string().max(32).optional(),
  correlationId: shortText.optional(),
});

// Consumer line: the caller is an authenticated individual (no embed key), so identity and
// wallet come from auth, not the body. agentId is optional and defaults to the flagship
// consumer agent; only vetted consumer agents are runnable (enforced in the route).
export const consumerChatBodySchema = z.object({
  message,
  agentId: id.optional(),
  sessionId: shortText.optional(),
  replyLanguage: z.string().max(32).optional(),
  correlationId: shortText.optional(),
  // Per-submit wallet-debit idempotency key: unique per distinct send, reused only when the SAME
  // send is retried, so a network/serverless replay dedups while a fresh message is charged.
  idempotencyKey: shortText.optional(),
});

// Consumer daily-brief schedule.
export const briefConfigSchema = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
  timezone: z.string().min(1).max(64),
  channel: z.enum(["app", "whatsapp", "email"]),
});

export const askChatBodySchema = z.object({
  message,
  sessionId: shortText.optional(),
  replyLanguage: z.string().max(32).optional(),
  correlationId: shortText.optional(),
});

export const rentBodySchema = z.object({
  agentId: id,
  tier: z.enum(["standard", "pro", "enterprise"]).optional(),
  workspaceId: shortText.optional(),
});

export const consentBodySchema = z.object({
  choice: z.enum(["accepted", "essential"]),
});

export const configureBodySchema = z.object({
  agentId: id,
  workspaceId: shortText.optional(),
  model: z.string().max(120).optional(),
  knowledge: longText.optional(),
  bindings: z.array(z.record(z.unknown())).max(100).optional(),
  connectedConnectors: z.array(z.string().max(80)).max(40).optional(),
  markRented: z.boolean().optional(),
});

export const knowledgePasteBodySchema = z.object({
  agentId: id,
  workspaceId: shortText.optional(),
  title: z.string().max(120).optional(),
  content: z.string().min(10).max(100_000),
});

export const knowledgeCrawlBodySchema = z.object({
  agentId: id,
  workspaceId: shortText.optional(),
  url: z.string().min(1).max(2000),
  maxPages: z.number().int().min(1).max(8).optional(),
});

export const dsarEraseBodySchema = z.object({
  confirm: z.literal(true),
});

export const topUpPackageId = z.enum(["5", "10", "20", "50", "100", "200"]);

export const walletTopUpBodySchema = z.object({
  workspaceId: shortText.optional(),
  packageId: topUpPackageId,
  usdAmount: z.number().positive().max(10_000).optional(),
});

// Start a Paystack checkout for a prepaid token top-up. No amount from the client —
// the package id fixes the price server-side. `scope` picks which wallet is credited:
// the workspace (B2B setup flow) or the signed-in consumer.
export const paystackInitBodySchema = z.object({
  packageId: topUpPackageId,
  scope: z.enum(["workspace", "consumer"]).optional(),
});

export const connectorsBodySchema = z.object({
  agentId: id,
  connectorId: z.string().min(1).max(80),
  workspaceId: shortText.optional(),
  config: z.record(z.string().max(4000)).optional(),
});

export const connectorCredentialsBodySchema = z.object({
  agentId: id,
  connectorId: z.string().min(1).max(80),
  workspaceId: shortText.optional(),
  config: z.record(z.string().max(4000)),
  remapTools: z.array(z.string().max(120)).max(40).optional(),
});

export const mcpToolsCallBodySchema = z.object({
  name: z.string().max(120).optional(),
  arguments: z.unknown().optional(),
});

export const slackChannelsBodySchema = z.object({
  channel: z.string().min(1).max(80),
  workspaceId: shortText.optional(),
});

export const customRequestBodySchema = z.object({
  business: z.string().min(2).max(200),
  need: z.string().min(10).max(8000),
  source: z.enum(["Marketing page", "Create", "Dashboard"]).optional(),
  contactEmail: z.string().email().max(320).optional(),
  contactName: z.string().max(200).optional(),
  channel: z.string().max(80).optional(),
});

export const customRequestStatusBodySchema = z.object({
  status: z.enum(["new", "reviewing", "scoped", "done", "declined"]),
});

export const onboardingCompleteBodySchema = z.object({
  companyName: z.string().min(2).max(200),
  market: z.enum(["us", "eu", "africa", "asia", "oceania"]),
  industry: z.string().min(1).max(120),
  companySize: z.string().min(1).max(40),
  intent: z.enum([
    "customer-support",
    "bookings",
    "hotel",
    "it-helpdesk",
    "sales",
    "other",
  ]),
  contactEmail: z.string().email().max(320).optional(),
});

export const onboardingPatchBodySchema = z.object({
  checklist: z
    .object({
      market: z.boolean().optional(),
      browse: z.boolean().optional(),
      try: z.boolean().optional(),
      rent: z.boolean().optional(),
      install: z.boolean().optional(),
    })
    .optional(),
  checklistDismissed: z.boolean().optional(),
});

export const workspaceMemberInviteBodySchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["readonly", "agent", "admin"]).optional(),
});

export const workspaceMemberRoleBodySchema = z.object({
  role: z.enum(["readonly", "agent", "admin", "owner"]),
});

export const oauthDisconnectBodySchema = z.object({
  agentId: id,
  workspaceId: shortText.optional(),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

/** Parse JSON body with a zod schema; returns data or a 400 Response. */
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json({ error: formatZodError(parsed.error) }, { status: 400 }),
    };
  }
  return { ok: true, data: parsed.data };
}

/** PUT /api/agents/[id]/domains — the approved-domains lock for the embed/app channel. */
export const agentDomainsBodySchema = z.object({
  workspaceId: shortText.optional(),
  domains: z.array(z.string().trim().max(200)).max(20),
});
