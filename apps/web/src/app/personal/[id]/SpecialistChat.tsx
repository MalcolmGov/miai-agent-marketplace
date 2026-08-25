"use client";

import { useEffect } from "react";
import { DEFAULT_BRAND_ID } from "@/lib/tenant-brands";
import { useConsumerChat } from "@/lib/use-consumer-chat";
import { ConsumerChatWindow } from "@/components/ConsumerChatWindow";

/**
 * A metered chat bound to a single consumer specialist. Reuses the shared consumer chat loop and
 * window (same SSE contract, wallet metering) — unlike the general assistant at /me it carries no
 * connectors, brand switcher or reminders; it just runs `agentId`.
 */
export default function SpecialistChat({
  agentId,
  agentName,
  starters,
}: {
  agentId: string;
  agentName: string;
  starters: string[];
}) {
  const chat = useConsumerChat({
    workspaceId: DEFAULT_BRAND_ID,
    agentId,
    initialGreeting: `Hi — I'm your ${agentName}. What would you like to work on?`,
  });
  const { loadWallet, balance } = chat;

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  return (
    <div className="flex flex-col gap-2.5">
      <ConsumerChatWindow
        chat={chat}
        starters={starters}
        placeholder={`Message your ${agentName}…`}
        ariaLabel={`Message your ${agentName}`}
        className="h-[58vh] min-h-[400px]"
      />
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Metered to your prepaid balance
        {typeof balance === "number" ? ` · ${balance.toLocaleString()} credits left` : ""}. Kept to what
        this specialist does; it guides rather than doing the work for you.
      </p>
    </div>
  );
}
