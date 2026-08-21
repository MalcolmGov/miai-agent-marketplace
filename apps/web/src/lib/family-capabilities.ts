/**
 * Build customer-facing capability copy for Learn more modals from an agent pack.
 * One pack (usually US / preferred market) represents the whole family.
 */
import type { AgentPackage } from "@miai/agent-protocol";

export type FamilyToolCapability = {
  name: string;
  label: string;
  description: string;
  sideEffects: "read-only" | "write" | "unknown";
};

export type FamilyCapabilities = {
  familyId: string;
  agentId: string;
  name: string;
  /** One-line job (cleaned). */
  summary: string;
  /** Longer “what this agent is” paragraph. */
  overview: string;
  /** Concrete things customers can use it for. */
  canDo: string[];
  /** Hard limits — prevents overselling (e.g. “coding assistant” ≠ IDE coder). */
  willNot: string[];
  tools: FamilyToolCapability[];
  /** Sample prompts from packaged evals. */
  exampleAsks: string[];
  /** How to get value after Rent / setup. */
  howItWorks: string[];
  channels: string[];
};

function humanizeToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bApi\b/g, "API")
    .replace(/\bPr\b/g, "PR")
    .replace(/\bHr\b/g, "HR")
    .replace(/\bIt\b/g, "IT");
}

function sectionAfter(md: string, heading: RegExp): string {
  const m = md.match(heading);
  if (!m || m.index === undefined) return "";
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/\n##\s+/);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

function bulletLines(block: string, max = 8): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s+/, "").replace(/\*\*/g, "").trim())
    .filter((l) => l.length > 12 && l.length < 220 && !/^#{1,6}\s/.test(l))
    .slice(0, max);
}

function extractJob(systemPrompt: string, fallback: string): string {
  const job = sectionAfter(systemPrompt, /##\s+Your job\s*\n/i);
  if (job) {
    const line = job.split("\n").map((l) => l.trim()).find((l) => l.length > 20);
    if (line) return line.replace(/\s+/g, " ").trim();
  }
  return fallback;
}

function cleanSummary(summary: string, name: string): string {
  let s = summary.replace(/\s+/g, " ").trim();
  s = s.replace(/\s*Multi-step workflows?:.*$/i, "").trim();
  // Drop the fictional example-tenant clause — "… for <Business> (<City>) —" — so the catalog
  // describes the role generically, not an agent built for one made-up company. Packs are resold
  // white-label across industries and markets; the runtime already personalises via {{business_name}},
  // and only these display summaries carried the sample company name. The middle class excludes the
  // separator dashes and "(", so it can't overlap the following group — a linear, backtracking-free
  // match (no ReDoS).
  s = s.replace(/\s+for\s+[A-Z][^—–(]*\([^)]*\)(?=\s*[—–-])/, "");
  s = s.replace(/^(US|EU|Asia|Africa|ZA|Oceania)\s*[—–-]\s*/i, "");
  const nameEsc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  s = s.replace(new RegExp(`^(?:${nameEsc}\\s*[—–-]\\s*)+`, "i"), "");
  s = s.replace(/^[\s—–-]+/, "").trim();
  if (s.length) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || summary;
}

function familyWillNotExtras(familyId: string): string[] {
  const id = familyId.toLowerCase();
  const out: string[] = [];
  if (/coding|devops|qa-testing|documentation-assistant|prompt-engineering/.test(id)) {
    out.push("Write, edit, merge, or push code in your repositories (it is not an IDE coding agent)");
    out.push("Run builds, tests, or CI jobs in your infrastructure");
  }
  if (/legal|law-firm|contract|tax|accounting|bookkeeping|investment|wealth|mortgage|loan|insurance/.test(id)) {
    out.push("Give formal professional advice or act as a licensed attorney, CPA, or advisor");
  }
  if (/clinic|dental|pharmacy|veterinary|gym/.test(id)) {
    out.push("Diagnose conditions or replace a licensed clinician");
  }
  return out;
}

function normalizeLimit(line: string): string | null {
  let s = line
    .replace(/\{\{[^}]+\}\}/g, "your business")
    .replace(/`+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^Deliberate exemption/i.test(s)) return null;
  if (/^The agent gives/i.test(s) && s.length > 180) s = s.slice(0, 177) + "…";
  // Prefer “Never / No / Off-topic / Does not” style limits
  if (
    /^(never|no |not |off-topic|do not|doesn't|does not|cannot|can't|the agent (gives|shares|never)|it never)/i.test(
      s,
    )
  ) {
    return s;
  }
  return null;
}

export function buildFamilyCapabilities(
  pkg: AgentPackage,
  familyId: string,
): FamilyCapabilities {
  const name = pkg.manifest.name.replace(/^(US|EU|Africa|Asia|Oceania|ZA)\s+/i, "").trim();
  const summary = cleanSummary(pkg.manifest.summary, name);
  const job = extractJob(pkg.system_prompt, summary);
  const channels = pkg.manifest.channels ?? [];

  const tools: FamilyToolCapability[] = (pkg.tools ?? []).map((t) => {
    const side =
      t.side_effects === "read-only"
        ? "read-only"
        : t.side_effects === "write" || t.side_effects === "financial"
          ? "write"
          : "unknown";
    return {
      name: t.name,
      label: humanizeToolName(t.name),
      description: (t.description || "").replace(/\s+/g, " ").trim(),
      sideEffects: side as FamilyToolCapability["sideEffects"],
    };
  });

  const readTools = tools.filter((t) => t.sideEffects === "read-only");
  const writeTools = tools.filter(
    (t) => t.sideEffects === "write" && t.name !== "handoff_to_human",
  );
  const hasHandoff = tools.some((t) => t.name === "handoff_to_human");

  const canDo: string[] = [];
  canDo.push(job);
  for (const t of readTools.slice(0, 4)) {
    canDo.push(
      t.description
        ? `${t.label}: ${t.description.replace(/\.$/, "")}`
        : `Look up details with ${t.label}`,
    );
  }
  for (const t of writeTools.slice(0, 3)) {
    canDo.push(
      t.description
        ? `${t.label} (only after reading details back and getting a clear yes)`
        : `Record a request with ${t.label} after you confirm`,
    );
  }
  if (hasHandoff) {
    canDo.push("Hand off to a human for complaints, edge cases, or when you ask for a person");
  }
  canDo.push(
    `Chat on ${channels.length ? channels.map((c) => c.toUpperCase()).join(", ") : "web"} once you go live`,
  );

  const guardBlock = [
    sectionAfter(pkg.guardrails ?? "", /##\s+Grounding/i),
    sectionAfter(pkg.guardrails ?? "", /##\s+Scope/i),
    sectionAfter(pkg.guardrails ?? "", /##\s+Privacy/i),
    sectionAfter(pkg.system_prompt ?? "", /##\s+Grounding/i),
    sectionAfter(pkg.system_prompt ?? "", /##\s+Privacy/i),
  ].join("\n");

  const willNot = [
    ...bulletLines(guardBlock, 10).map(normalizeLimit).filter(Boolean) as string[],
    ...familyWillNotExtras(familyId),
    "Invent facts, prices, deadlines, or references that are not in your Knowledge or tool results",
    "Charge wallet tokens during a free sandbox try — renting is required to go live",
  ];
  // Dedupe (case-insensitive), keep order
  const seen = new Set<string>();
  const willNotUnique = willNot.filter((line) => {
    const k = line.toLowerCase().slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);

  const exampleAsks = (pkg.evals ?? [])
    .map((e) => {
      if (e && typeof e === "object" && "input" in e) {
        const input = (e as { input?: unknown }).input;
        return typeof input === "string" ? input.trim() : "";
      }
      return "";
    })
    .filter((s) => s.length > 10 && s.length < 160 && !/jailbreak|poem|essay/i.test(s))
    .slice(0, 5);

  const overview = [
    summary,
    "It answers from the Knowledge you add (FAQs, policies, docs) plus tool results — not from guessing.",
    writeTools.length
      ? "Any write action requires the agent to read the details back and get your clear yes first."
      : "It stays read-only unless you connect Actions that allow writes.",
  ].join(" ");

  const howItWorks = [
    "Add Knowledge — paste FAQs, upload files, or crawl your site so answers match your business",
    "Optional: Connect tools (Actions) for live lookups and tickets",
    "Try in Sandbox (free) to verify tone and grounding before you pay",
    "Rent + go live on your website, app, or messaging channels",
  ];

  return {
    familyId,
    agentId: pkg.manifest.id,
    name,
    summary,
    overview,
    canDo: canDo.slice(0, 8),
    willNot: willNotUnique,
    tools,
    exampleAsks,
    howItWorks,
    channels,
  };
}
