import { handleEmbedChatOptions, handleEmbedChatPost } from "@/lib/handlers/embed-chat";

export const dynamic = "force-dynamic";

/** The widget runs on customers' websites, so this endpoint must answer cross-origin.
 *  The embed key identifies (and is scoped to) the tenant agent; it is public by design.
 *  Origins are gated by EMBED_ALLOWED_ORIGINS (* = allow all, default for staging). */

export function OPTIONS(req: Request) {
  return handleEmbedChatOptions(req);
}

export async function POST(req: Request) {
  return handleEmbedChatPost(req);
}
