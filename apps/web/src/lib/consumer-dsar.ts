import { createWalletAdapter } from "@miai/wallet-adapter";
import {
  eraseAllMemories,
  listMemories,
  type MemoryOwner,
} from "@/lib/consumer-memory-store";
import {
  eraseAllGoals,
  eraseAllPeople,
  listGoals,
  listPeople,
} from "@/lib/consumer-lifegraph-store";
import { eraseAllReminders, listReminders } from "@/lib/consumer-reminders-store";
import { deleteBrief, getBriefRecord } from "@/lib/consumer-brief-store";
import { isConsumerLinked, unbindTelegramForConsumer } from "@/lib/consumer-telegram-store";
import { deleteKnowledgeForWorkspace, listKnowledgeSourcesForWorkspace } from "@/lib/knowledge";
import { deleteTurnTranscriptsForWorkspace, listTurnTranscripts } from "@/lib/traceability";

/**
 * Data-subject rights for a signed-in CONSUMER (the person themselves), distinct from the
 * workspace/business DSAR in `dsar-erase.ts` (owner/admin erasing a brand's operational data).
 *
 * Identity model (see consumer-turn.ts): a consumer's personal data is keyed two ways —
 *  - tenant-scoped stores (memory, goals, people, reminders) by {tenantId, consumerId}; and
 *  - person-scoped stores (brief, telegram binding, their chat transcripts, their uploaded
 *    knowledge) by the consumer's own id, which equals walletId equals auth.userId.
 * Erase/export therefore span BOTH keyings but always stay inside this one person.
 *
 * Deliberately NOT touched:
 *  - The wallet BALANCE. Export reads it (portability); erase never zeroes it — prepaid tokens are
 *    the person's money, and a DSAR request must not silently forfeit them. Refunds are a separate,
 *    explicit flow.
 *  - The wallet PAUSE row (miai_consumer_wallet_pause). It carries no personal data, and deleting it
 *    would re-open the free-serve leak that migration 008 closed (a paused, zero-balance account
 *    would resume serving for free until the pause was re-established).
 */

export type ConsumerErasureCounts = Record<string, number>;

export type ConsumerIdentity = {
  /** Brand/workspace the person belongs to — the memory tenant boundary (auth.workspaceId). */
  tenantId: string;
  /** The person's account id (= walletId = auth.userId). */
  consumerId: string;
};

/** Best-effort erasure of one consumer's personal data across every store that holds it. */
export async function eraseConsumerData(
  identity: ConsumerIdentity,
): Promise<{ deleted: ConsumerErasureCounts }> {
  const owner: MemoryOwner = {
    tenantId: identity.tenantId,
    consumerId: identity.consumerId,
  };
  // Person-scoped stores are keyed by the consumer's own id (= walletId).
  const personId = identity.consumerId;

  const deleted: ConsumerErasureCounts = {
    memories: 0,
    goals: 0,
    people: 0,
    reminders: 0,
    briefRecords: 0,
    telegramBindings: 0,
    conversationTurns: 0,
    knowledgeSources: 0,
  };

  deleted.memories = await eraseAllMemories(owner);
  deleted.goals = await eraseAllGoals(owner);
  deleted.people = await eraseAllPeople(owner);
  deleted.reminders = await eraseAllReminders(owner);
  deleted.briefRecords = await deleteBrief(personId);
  deleted.telegramBindings = await unbindTelegramForConsumer(identity.tenantId, personId);
  deleted.conversationTurns = await deleteTurnTranscriptsForWorkspace(personId);
  deleted.knowledgeSources = await deleteKnowledgeForWorkspace(personId);

  return { deleted };
}

/** Portable export of one consumer's personal data. Read-only — never mutates or zeroes anything. */
export async function exportConsumerData(identity: ConsumerIdentity) {
  const owner: MemoryOwner = {
    tenantId: identity.tenantId,
    consumerId: identity.consumerId,
  };
  const personId = identity.consumerId;

  const [memories, goals, people, reminders, brief, telegramLinked, turns, knowledge] =
    await Promise.all([
      listMemories(owner),
      listGoals(owner),
      listPeople(owner),
      listReminders(owner),
      getBriefRecord(personId),
      isConsumerLinked(identity.tenantId, personId),
      listTurnTranscripts({ workspaceId: personId, limit: 500 }),
      listKnowledgeSourcesForWorkspace(personId),
    ]);

  let walletTokens: number | null = null;
  try {
    walletTokens = (await createWalletAdapter().getBalance(personId)).tokens;
  } catch {
    walletTokens = null;
  }

  return {
    exportType: "dsar_consumer_export",
    exportedAt: new Date().toISOString(),
    tenantId: identity.tenantId,
    consumerId: identity.consumerId,
    notice:
      "Personal-data export for the signed-in person. Prepaid wallet tokens are shown for reference and are NOT erased by a deletion request.",
    wallet: { tokens: walletTokens },
    memories,
    goals,
    people,
    reminders,
    brief,
    telegram: { linked: telegramLinked },
    knowledge: knowledge.map((s) => ({
      id: s.id,
      agentId: s.agentId,
      type: s.type,
      title: s.title,
      url: s.url,
      filename: s.filename,
      chars: s.chars,
      status: s.status,
      createdAt: s.createdAt,
      contentPreview: s.content.slice(0, 4000),
      contentChars: s.content.length,
    })),
    conversationTurns: turns.map((t) => ({
      id: t.id,
      at: t.at,
      correlationId: t.correlationId,
      agentId: t.agentId,
      channel: t.channel,
      sessionId: t.sessionId,
      userMessage: t.userMessage.slice(0, 4000),
      assistantMessage: t.assistantMessage.slice(0, 4000),
      tools: t.toolCalls.map((x) => x.name),
      tokensDebited: t.tokensDebited,
    })),
  };
}
