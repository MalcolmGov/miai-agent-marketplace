import { randomUUID } from "node:crypto";
import { runTurn } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { defaultBindingsForTools } from "@miai/presets";
import { listFamilies } from "@/lib/catalog";
import {
  getMarketplaceAssistantPackage,
  marketplaceAssistantId,
  marketplaceWorkspaceId,
} from "@/lib/marketplace-assistant";
import { embedKeyFor, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Voice Studio forge — turns ONE complete spoken request into either:
 *   • a recommendation of an existing marketplace family (rent & set up), or
 *   • a genuinely custom agent compiled and saved to the caller's workspace
 *     (state "configuring" so it appears under My Agents ready for quick setup).
 *
 * The decision is grounded in the LIVE catalogue (listFamilies) — never invented ids — and the
 * transcript is used verbatim; the client is responsible for only submitting a completed utterance.
 */

const VALID_CATEGORIES = new Set(["sales", "operations", "finance", "support", "commerce", "custom"]);

type Decision =
  | { mode: "recommend"; familyId?: string; familyName?: string; reply: string }
  | {
      mode: "custom";
      name: string;
      role?: string;
      category?: string;
      systemPrompt?: string;
      tools?: string[];
      reply: string;
    }
  | { mode: "none"; reply: string };

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  let body: { transcript?: string };
  try {
    body = (await req.json()) as { transcript?: string };
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }

  const transcript = (body.transcript || "").trim().slice(0, 1500);
  if (transcript.split(/\s+/).filter(Boolean).length < 3) {
    return apiErrorFromRequest(req, 400, "Tell me a bit more — describe the workflow you want to automate.");
  }

  const pkg = await getMarketplaceAssistantPackage();
  if (!pkg) return apiErrorFromRequest(req, 503, "Voice architect unavailable");

  const families = await listFamilies();
  const byId = new Map(families.map((f) => [f.id, f]));
  const catalogue = families
    .map((f) => `- ${f.id} | ${f.name} | ${f.category} | ${(f.summary || "").slice(0, 110)}`)
    .join("\n");

  const instructions = [
    "You are the Voice Studio Architect for the MyInstantAI agent marketplace.",
    "The user SPOKE the request below (speech-recognition transcript — may contain filler words).",
    "Decide the best next step:",
    "1) If ONE existing marketplace family clearly fits their need (>=70% fit), recommend it.",
    "2) Only when nothing fits, design a CUSTOM agent for them.",
    "CATALOGUE (id | name | category | gist):",
    catalogue,
    "Respond with ONLY one compact JSON object — no markdown fences, no commentary:",
    '{"mode":"recommend","familyId":"<exact id from the catalogue>","reply":"<2-3 warm sentences, no emoji, say why this family fits>"}',
    "or",
    '{"mode":"custom","name":"<2-4 word title>","role":"<one line>","category":"<sales|operations|finance|support|commerce|custom>","systemPrompt":"<3-5 sentence agent persona for THIS business>","tools":["<4-6 snake_case tool ids>"],"reply":"<2-3 warm sentences, no emoji>"}',
    "Rules: prefer recommend whenever a family reasonably fits. NEVER invent a family id — use only ids from the catalogue. Never promise prices. The reply is spoken aloud, so keep it natural.",
    "CRITICAL: Your ENTIRE response must be only that single JSON object — no prose before or after, no markdown fences. If you catch yourself writing a sentence, stop and output the JSON instead.",
  ].join("\n\n");

  let decision: Decision | null = null;
  try {
    const result = await runTurn(
      {
        workspaceId: marketplaceWorkspaceId(),
        agentId: marketplaceAssistantId(),
        pkg,
        messages: [],
        userMessage: transcript,
        model: pkg.manifest.model.primary,
        mode: "live",
        state: "live",
        systemAppend: instructions,
        sessionId: `voice-forge-${randomUUID()}`,
      },
      { wallet: createWalletAdapter() },
    );
    const text = result.assistantMessage || "";
    const parsed = extractJson(text) as Decision | null;
    if (parsed && (parsed.mode === "recommend" || parsed.mode === "custom")) {
      decision = parsed;
    } else {
      // Resilience: the persona prompt sometimes wins and the model replies in prose. If the
      // prose clearly names one catalogue family, treat it as a recommendation of that family.
      const lower = text.toLowerCase();
      const named = families.find(
        (f) => f.name.length > 5 && lower.includes(f.name.toLowerCase()),
      );
      if (named) {
        decision = { mode: "recommend", familyId: named.id, reply: text.trim().slice(0, 400) };
      } else {
        console.error("voice_forge_non_json", text.slice(0, 300));
      }
    }
  } catch (e) {
    console.error("voice_forge_failed", e);
    decision = null;
  }

  if (!decision) {
    return apiOk({
      ok: true,
      mode: "none",
      reply:
        "I didn't quite catch a clear workflow there. Tell me the outcome you want — for example, handling WhatsApp order questions, chasing unpaid invoices, or booking appointments — and I'll match or build the right agent.",
    });
  }

  if (decision.mode === "recommend") {
    const family = decision.familyId ? byId.get(decision.familyId) : undefined;
    if (!family) {
      return apiOk({
        ok: true,
        mode: "none",
        reply:
          "I couldn't match that to one of our catalogue families yet. Say a little more about the workflow, or browse the marketplace and I'll point you to the closest fit.",
      });
    }
    return apiOk({
      ok: true,
      mode: "recommend",
      familyId: family.id,
      familyName: family.name,
      reply: decision.reply,
    });
  }

  // mode === "custom" — compile and save to the caller's workspace for quick setup.
  const name = (decision.name || "").trim().slice(0, 60) || "Custom Operations Agent";
  const role = (decision.role || "").trim().slice(0, 160);
  const category = VALID_CATEGORIES.has((decision.category || "").toLowerCase())
    ? (decision.category || "custom").toLowerCase()
    : "custom";
  const systemPrompt = (decision.systemPrompt || "").trim().slice(0, 2000);
  const tools = Array.isArray(decision.tools)
    ? [...new Set(decision.tools.filter((t): t is string => typeof t === "string" && /^[a-z0-9_\-]{2,40}$/.test(t)))].slice(0, 6)
    : [];

  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const agentId = `${slugBase || "voice-agent"}-${Date.now().toString(36).slice(-4)}`;

  try {
    const rental = await upsertWorkspaceAgent(auth.workspaceId, agentId, {
      agentId,
      name,
      summary: role,
      category,
      state: "configuring",
      model: "claude-haiku-4-5",
      tier: "standard",
      knowledge: "",
      systemPrompt,
      toolsList: tools,
      bindings: defaultBindingsForTools(tools),
      connectedConnectors: [],
      isCustom: true,
      accentColor: "#00D2FF",
      market: "global",
    });
    return apiOk({
      ok: true,
      mode: "custom",
      reply: decision.reply,
      agent: {
        agentId,
        name,
        role,
        publicKey: rental?.publicKey ?? embedKeyFor(auth.workspaceId, agentId),
      },
    });
  } catch {
    return apiErrorFromRequest(req, 500, "Could not save the agent to your workspace");
  }
}
