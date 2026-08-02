import { z } from "zod";

export const studioChatBodySchema = z.object({
  agentId: z.string().min(1),
  message: z.string().optional(),
  workspaceId: z.string().optional(),
  mode: z.enum(["sandbox", "live"]).optional(),
  clear: z.boolean().optional(),
  replyLanguage: z.string().optional(),
  correlationId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const channelChatBodySchema = z.object({
  key: z.string().min(1),
  message: z.string().min(1),
  sessionId: z.string().optional(),
  replyLanguage: z.string().optional(),
  correlationId: z.string().optional(),
});

export const askChatBodySchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  replyLanguage: z.string().optional(),
  correlationId: z.string().optional(),
});

export const rentBodySchema = z.object({
  agentId: z.string().min(1),
  tier: z.enum(["standard", "pro", "enterprise"]).optional(),
  workspaceId: z.string().optional(),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}
