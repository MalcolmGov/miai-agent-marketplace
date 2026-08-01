import { promises as fs } from "node:fs";
import path from "node:path";
import { loadAgentPackage, type AgentPackage } from "@miai/agent-protocol";

const AGENT_ID = "marketplace-assistant";
const PLATFORM_WORKSPACE = "platform";

function platformDir(): string {
  if (process.env.PLATFORM_DIR) return path.resolve(process.env.PLATFORM_DIR);
  if (process.env.CATALOG_DIR) return path.resolve(process.env.CATALOG_DIR, "../platform");
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "platform");
  return path.resolve(process.cwd(), "../../data/platform");
}

export function marketplaceAssistantId(): string {
  return AGENT_ID;
}

export function marketplaceWorkspaceId(): string {
  return PLATFORM_WORKSPACE;
}

export async function getMarketplaceAssistantPackage(): Promise<AgentPackage | null> {
  try {
    const raw = await fs.readFile(
      path.join(platformDir(), `${AGENT_ID}.agent.json`),
      "utf8",
    );
    return loadAgentPackage(JSON.parse(raw));
  } catch {
    return null;
  }
}
