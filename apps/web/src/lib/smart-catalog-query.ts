/**
 * Parse a natural-language catalogue query into structured filters.
 * Used when Smart filter is on — e.g. "internal dental workflows in africa".
 */

export type SmartCatalogQuery = {
  q: string;
  market: string;
  audience: string;
  category: string;
  workflowsOnly: boolean;
  applied: string[];
};

const MARKET_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "africa", re: /\b(africa|african|za|south africa|nigeria|kenya)\b/i },
  { id: "asia", re: /\b(asia|asian|india|singapore|apac)\b/i },
  { id: "oceania", re: /\b(oceania|australia|australian|nz|new zealand|pacific|auckland|sydney|melbourne)\b/i },
  { id: "eu", re: /\b(eu|europe|european|uk|u\.k\.?|britain|united kingdom)\b/i },
  {
    id: "us",
    re: /\b(us|usa|u\.s\.a?\.?|united states(?: of america)?|america|american)\b/i,
  },
];

const AUDIENCE_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "internal", re: /\b(internal|back[- ]?office|employee|staff|hr)\b/i },
  { id: "customer", re: /\b(customer|client[- ]facing|front[- ]?office|guest|patient)\b/i },
];

const CATEGORY_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "Telecommunications", re: /\b(telecom|fibre|fiber|sim|airtime|network fault|mobile network|device upgrade|enterprise connectivity|sd-?wan)\b/i },
  { id: "Government & public sector", re: /\b(government|citizen|municipality|tax office|public sector|permits?|passport|visa|licensing|social services|benefits)\b/i },
  { id: "Manufacturing & industrial", re: /\b(manufactur|warehouse|maintenance desk|quality assurance|factory|industrial|production planning)\b/i },
  { id: "Health & wellness", re: /\b(health|wellness|dental|clinic|pharmacy|vet|gym|medical)\b/i },
  { id: "Hospitality & travel", re: /\b(hotel|hospitality|travel|concierge|guest|restaurant|salon|barber)\b/i },
  { id: "Logistics & field ops", re: /\b(logistics|field|trades?|dispatch|fleet|delivery|home services)\b/i },
  { id: "HR & internal ops", re: /\b(helpdesk|it support|payroll|procurement|executive assistant|recruitment|interview|hr|learning|performance review)\b/i },
  { id: "Financial services", re: /\b(finance|bank|insurance|loan|claims|accounting|mortgage|credit card|wealth|investment|fraud)\b/i },
  { id: "Retail & e-commerce", re: /\b(retail|e-?commerce|stock|returns?|loyalty|shop)\b/i },
  { id: "Education", re: /\b(education|school|student|admissions|onboarding)\b/i },
  { id: "Property", re: /\b(property|rental|real estate|building)\b/i },
  { id: "Professional services", re: /\b(law|legal|contract review|case management|legal research|agency|professional services)\b/i },
  { id: "Customer & front office", re: /\b(support|sales|qualifier|front desk)\b/i },
];

const WORKFLOW_RE = /\b(workflow|workflows|multi[- ]?step|can act)\b/i;

/** Voice / typed variants → tokens the market regexes can match. */
function normalizeCatalogQuery(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // "U.S", "U.S.", "U. S.", "U S", "U.S.A."
    .replace(/\bu\s*\.?\s*s\s*\.?\s*a?\s*\.?\b/gi, " us ")
    .replace(/\bunited\s+states(?:\s+of\s+america)?\b/gi, " us ")
    // "E.U", "U.K."
    .replace(/\be\s*\.?\s*u\s*\.?\b/gi, " eu ")
    .replace(/\bu\s*\.?\s*k\s*\.?\b/gi, " uk ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMatch(text: string, re: RegExp): string {
  return text.replace(re, " ").replace(/\s+/g, " ").trim();
}

export function parseSmartCatalogQuery(raw: string): SmartCatalogQuery {
  let rest = normalizeCatalogQuery(raw);
  const applied: string[] = [];
  let market = "all";
  let audience = "all";
  let category = "all";
  let workflowsOnly = false;

  if (WORKFLOW_RE.test(rest)) {
    workflowsOnly = true;
    applied.push("Workflows");
    rest = stripMatch(rest, WORKFLOW_RE);
  }

  for (const m of MARKET_PATTERNS) {
    if (m.re.test(rest)) {
      market = m.id;
      applied.push(m.id === "us" || m.id === "eu" ? m.id.toUpperCase() : m.id[0].toUpperCase() + m.id.slice(1));
      rest = stripMatch(rest, m.re);
      break;
    }
  }

  for (const a of AUDIENCE_PATTERNS) {
    if (a.re.test(rest)) {
      audience = a.id;
      applied.push(a.id === "internal" ? "Internal" : "Customer");
      rest = stripMatch(rest, a.re);
      break;
    }
  }

  for (const c of CATEGORY_PATTERNS) {
    if (c.re.test(rest)) {
      category = c.id;
      applied.push(c.id);
      // Keep industry keywords in free-text search (e.g. "dental").
      break;
    }
  }

  // Soft filler words (leave domain terms for text match)
  rest = rest
    .replace(/\b(in|for|the|a|an|agents?|show|find|me|please|with|near|of)\b/gi, " ")
    // Voice left-overs after "U.S." / "E.U." normalization
    .replace(/^[.\s,;:]+|[.\s,;:]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { q: rest, market, audience, category, workflowsOnly, applied };
}
