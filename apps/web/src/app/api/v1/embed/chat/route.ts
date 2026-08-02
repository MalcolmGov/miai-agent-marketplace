import { handleEmbedChatOptions, handleEmbedChatPost } from "@/lib/handlers/embed-chat";

/** Versioned embed chat — same handler as /api/embed/chat. */

export function OPTIONS(req: Request) {
  return handleEmbedChatOptions(req);
}

export async function POST(req: Request) {
  return handleEmbedChatPost(req);
}
