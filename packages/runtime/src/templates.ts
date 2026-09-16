import type { AgentPackage } from "@miai/agent-protocol";

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Pull `Example (replace): "…"` values from package text (may span lines). */
function examplesFromText(text: string): string[] {
  const out: string[] = [];
  // Catalogue examples often wrap across lines inside the quotes.
  const re = /Example\s*\(replace\)\s*:\s*"([\s\S]*?)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = m[1].replace(/\s+/g, " ").trim();
    if (v) out.push(v);
  }
  return out;
}

/** Short display name from a long example blurb ("Baobab Travel Desk — …" → "Baobab Travel Desk"). */
function shortName(example: string): string {
  const beforeDash = example.split(/\s+[—–-]\s+/)[0]?.trim() || example;
  return beforeDash.length > 64 ? beforeDash.slice(0, 64).trim() : beforeDash;
}

function extractNearVar(text: string, key: string): string | null {
  const re = new RegExp(
    `\\{\\{\\s*${key}\\s*\\}\\}[\\s\\S]{0,400}?Example\\s*\\(replace\\)\\s*:\\s*"([\\s\\S]*?)"`,
    "i",
  );
  const m = text.match(re);
  if (!m?.[1]) return null;
  return shortName(m[1].replace(/\s+/g, " ").trim());
}

function extractContact(text: string, kind: "phone" | "email"): string | null {
  if (kind === "email") {
    const m = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    return m?.[0] ?? null;
  }
  const m = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/,
  );
  return m?.[0]?.trim() ?? null;
}

const NAME_KEYS = new Set([
  "business_name",
  "utility_name",
  "scheme_name",
  "bank_name",
  "institution_name",
  "firm_name",
  "managing_agent",
  "hotel_name",
  "restaurant_name",
  "practice_name",
  "salon_name",
  "gym_name",
]);

/**
 * Build substitution map for `{{vars}}` in agent packages.
 * Prefer example literals from knowledge, then manifest name, then safe demo defaults.
 *
 * `neutralName` is for live turns where the tenant's own knowledge was supplied and it names no
 * business: callers pass it so the prompt says "this business" instead of wearing the catalogue
 * example (or the role name) as the tenant's business name.
 */
export function buildTemplateVars(
  pkg: AgentPackage,
  overrides?: Record<string, string>,
  opts?: { neutralName?: boolean },
): Record<string, string> {
  const blob = [pkg.system_prompt, pkg.knowledge, pkg.guardrails].join("\n");
  const keys = new Set<string>();
  for (const m of blob.matchAll(VAR_RE)) keys.add(m[1]!);

  const examples = examplesFromText(blob);
  const primaryExample = examples[0] ? shortName(examples[0]) : "";
  const displayName =
    primaryExample ||
    (opts?.neutralName
      ? "this business"
      : pkg.manifest.name.replace(/\s*\(.*?\)\s*/g, "").trim());

  const phone = extractContact(blob, "phone") || "+1 (555) 010-2000";
  const email = extractContact(blob, "email") || "support@example.com";
  const today = new Date().toISOString().slice(0, 10);

  const vars: Record<string, string> = {
    today,
    business_name: displayName,
    utility_name: displayName,
    scheme_name: displayName,
    bank_name: displayName,
    institution_name: displayName,
    firm_name: displayName,
    managing_agent: displayName,
    support_phone: phone,
    support_email: email,
    emergency_line: phone,
    business_address: "123 Main Street",
    opening_hours: "Mon–Fri 09:00–17:00",
    admissions_phone: phone,
    admissions_email: email,
    salon_phone: phone,
    salon_email: email,
    sales_email: email,
    sales_contact: email,
    restaurant_phone: phone,
    restaurant_email: email,
    procurement_phone: phone,
    procurement_email: email,
    office_phone: phone,
    office_email: email,
    managing_agent_phone: phone,
    managing_agent_email: email,
    intake_phone: phone,
    intake_email: email,
    gym_phone: phone,
    gym_email: email,
  };

  for (const key of keys) {
    const near = extractNearVar(blob, key);
    if (near) {
      vars[key] = NAME_KEYS.has(key) ? near : near;
      continue;
    }
    if (!(key in vars)) {
      if (NAME_KEYS.has(key) || /_name$/.test(key)) vars[key] = displayName;
      else if (/phone|line|tel/.test(key)) vars[key] = phone;
      else if (/email|contact/.test(key)) vars[key] = email;
      else if (key === "today") vars[key] = today;
      else vars[key] = displayName;
    }
  }

  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (v?.trim()) vars[k] = v.trim();
    }
  }
  return vars;
}

export function applyTemplateVars(text: string, vars: Record<string, string>): string {
  if (!text || !text.includes("{{")) return text;
  return text.replace(VAR_RE, (_, key: string) => {
    if (vars[key] != null && vars[key] !== "") return vars[key];
    // Never leave raw {{placeholders}} in customer-visible prompts/replies.
    return key === "today" ? new Date().toISOString().slice(0, 10) : "our team";
  });
}

/** Fill system prompt, knowledge, and guardrails on a package copy. */
export function materializePackage(
  pkg: AgentPackage,
  overrides?: Record<string, string>,
): AgentPackage {
  const vars = buildTemplateVars(pkg, overrides);
  return {
    ...pkg,
    system_prompt: applyTemplateVars(pkg.system_prompt, vars),
    knowledge: applyTemplateVars(pkg.knowledge, vars),
    guardrails: applyTemplateVars(pkg.guardrails, vars),
  };
}

/** Last-line defense: strip any leaked placeholders from assistant text. */
export function scrubLeakedPlaceholders(text: string, vars?: Record<string, string>): string {
  if (!text.includes("{{")) return text;
  const map = vars ?? {};
  return applyTemplateVars(text, map);
}
