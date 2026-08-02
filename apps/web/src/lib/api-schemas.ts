import { z } from "zod";

const id = z.string().min(1).max(200);
const shortText = z.string().max(200);
const message = z.string().min(1).max(8000);
const optionalMessage = z.string().max(8000).optional();

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

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}
