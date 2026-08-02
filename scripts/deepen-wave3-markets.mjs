#!/usr/bin/env node
/**
 * Deepen Wave 3 market packs from us-{family} heroes.
 * Rewrites eu-/africa-/asia- packs with regional tenants, clean compliance,
 * grounded evals (no compliance-in-input pollution), version 1.1.0.
 *
 * Cluster B (Claude go-live) is hard-protected and never overwritten.
 *
 * Usage: node scripts/deepen-wave3-markets.mjs [--cluster=a|c|d|e|f|ac|all]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogDir = path.join(root, "data/catalog");
const pilotsDir = path.join(root, "docs/pilots");
const packsFile = path.join(catalogDir, "market-packs.json");

/** Claude Cluster B — never overwrite these market packs. */
const CLUSTER_B_PROTECTED = new Set([
  "restaurant-takeaway",
  "salon-booking",
  "clinic-front-desk",
  "customer-support",
  "delivery-tracking",
  "trades-receptionist",
]);

const CLUSTERS = {
  a: [
    "executive-assistant",
    "it-helpdesk",
    "dental-front-desk",
    "hotel-guest",
    "sales-qualifier",
    "home-services",
  ],
  c: [
    "events-venue",
    "onboarding-buddy",
    "accounting-practice",
    "building-management",
    "gym-membership",
    "pharmacy",
  ],
  d: [
    "admissions",
    "agency-studio",
    "bank-branch",
    "bookkeeping",
    "course-advisor",
    "dental-practice",
    "field-service",
    "fleet-driver",
    "front-desk",
    "grant-stock-planner",
    "hotel-concierge",
    "hr-helpdesk",
  ],
  e: [
    "insurance-broker",
    "insurance-claims",
    "law-firm-intake",
    "loan-prequalifier",
    "loyalty-rewards",
    "marketing-assistant",
    "mobile-money",
    "order-tracking",
    "payment-disputes",
    "payroll-queries",
    "policy-compliance",
    "procurement",
  ],
  f: [
    "product-finder",
    "property-enquiries",
    "remittance",
    "rental-enquiries",
    "returns-exchanges",
    "spaza-merchant",
    "stock-availability",
    "student-helpdesk",
    "tour-activity",
    "travel-desk",
    "utility-billing",
    "vas-concierge",
    "veterinary",
  ],
};

/** Per-family regional tenants (fictional, replaceable). */
const TENANTS = {
  "executive-assistant": {
    us: { name: "Maya Chen / Ridgeway Labs EA desk", city: "Austin, TX" },
    eu: { name: "Maya Chen / Ridgeway Labs Berlin EA desk", city: "Berlin" },
    africa: { name: "Maya Chen / Ridgeway Labs Johannesburg EA desk", city: "Johannesburg" },
    asia: { name: "Maya Chen / Ridgeway Labs Singapore EA desk", city: "Singapore" },
  },
  "it-helpdesk": {
    us: { name: "Ridgeway Labs IT Helpdesk", city: "Austin, TX" },
    eu: { name: "Ridgeway Labs IT Berlin", city: "Berlin" },
    africa: { name: "Ridgeway Labs IT Johannesburg", city: "Johannesburg" },
    asia: { name: "Ridgeway Labs IT Singapore", city: "Singapore" },
  },
  "dental-front-desk": {
    us: { name: "Oak Street Dental", city: "Austin, TX" },
    eu: { name: "Oak Street Dental Berlin", city: "Berlin" },
    africa: { name: "Oak Street Dental Rosebank", city: "Johannesburg" },
    asia: { name: "Oak Street Dental Orchard", city: "Singapore" },
  },
  "hotel-guest": {
    us: { name: "Riverbend Inn Austin", city: "Austin, TX" },
    eu: { name: "Riverbend Inn Amsterdam", city: "Amsterdam" },
    africa: { name: "Riverbend Inn Cape Town", city: "Cape Town" },
    asia: { name: "Riverbend Inn Singapore", city: "Singapore" },
  },
  "sales-qualifier": {
    us: { name: "Ledgerly", city: "Austin, TX" },
    eu: { name: "Ledgerly Berlin", city: "Berlin" },
    africa: { name: "Ledgerly Johannesburg", city: "Johannesburg" },
    asia: { name: "Ledgerly Singapore", city: "Singapore" },
  },
  "home-services": {
    us: { name: "HomeLine Services Austin", city: "Austin, TX" },
    eu: { name: "HomeLine Services Berlin", city: "Berlin" },
    africa: { name: "HomeLine Services Johannesburg", city: "Johannesburg" },
    asia: { name: "HomeLine Services Singapore", city: "Singapore" },
  },
  "events-venue": {
    us: { name: "Willow Creek Estate", city: "Austin, TX" },
    eu: { name: "Willow Creek Estate Berlin", city: "Berlin" },
    africa: { name: "Willow Creek Estate Stellenbosch", city: "Cape Town" },
    asia: { name: "Willow Creek Estate Singapore", city: "Singapore" },
  },
  "onboarding-buddy": {
    us: { name: "Ridgeway Labs", city: "Austin, TX" },
    eu: { name: "Ridgeway Labs Berlin", city: "Berlin" },
    africa: { name: "Ridgeway Labs Johannesburg", city: "Johannesburg" },
    asia: { name: "Ridgeway Labs Singapore", city: "Singapore" },
  },
  "accounting-practice": {
    us: { name: "Ledgerline Accountants", city: "Austin, TX" },
    eu: { name: "Ledgerline Accountants Berlin", city: "Berlin" },
    africa: { name: "Ledgerline Accountants Johannesburg", city: "Johannesburg" },
    asia: { name: "Ledgerline Accountants Singapore", city: "Singapore" },
  },
  "building-management": {
    us: { name: "Cedar Ridge Condominiums", city: "Austin, TX" },
    eu: { name: "Cedar Ridge Residences Berlin", city: "Berlin" },
    africa: { name: "Cedar Ridge Residences Sandton", city: "Johannesburg" },
    asia: { name: "Cedar Ridge Residences Singapore", city: "Singapore" },
  },
  "gym-membership": {
    us: { name: "Ironleaf Fitness", city: "Austin, TX" },
    eu: { name: "Ironleaf Fitness Berlin", city: "Berlin" },
    africa: { name: "Ironleaf Fitness Johannesburg", city: "Johannesburg" },
    asia: { name: "Ironleaf Fitness Singapore", city: "Singapore" },
  },
  pharmacy: {
    us: { name: "Riverside Community Pharmacy", city: "Austin, TX" },
    eu: { name: "Riverside Community Pharmacy Berlin", city: "Berlin" },
    africa: { name: "Riverside Community Pharmacy Johannesburg", city: "Johannesburg" },
    asia: { name: "Riverside Community Pharmacy Singapore", city: "Singapore" },
  },
  admissions: {
    us: { name: "Horizon College of Technology", city: "Austin, TX", phone: "512-555-0144" },
    eu: { name: "Horizon College Berlin", city: "Berlin", phone: "+49 30 1234 5600" },
    africa: { name: "Horizon College Johannesburg", city: "Johannesburg", phone: "+27 11 555 0144" },
    asia: { name: "Horizon College Singapore", city: "Singapore", phone: "+65 6123 0144" },
  },
  "agency-studio": {
    us: { name: "Brightline Studio", city: "Austin, TX" },
    eu: { name: "Brightline Studio Amsterdam", city: "Amsterdam" },
    africa: { name: "Brightline Studio Cape Town", city: "Cape Town" },
    asia: { name: "Brightline Studio Singapore", city: "Singapore" },
  },
  "bank-branch": {
    us: { name: "Riverbend Community Bank — Downtown Austin", city: "Austin, TX" },
    eu: { name: "Riverbend Bank — Berlin Mitte", city: "Berlin" },
    africa: { name: "Riverbend Bank — Sandton", city: "Johannesburg" },
    asia: { name: "Riverbend Bank — Marina Bay", city: "Singapore" },
  },
  bookkeeping: {
    us: { name: "Ledgerlane Bookkeeping", city: "Austin, TX" },
    eu: { name: "Ledgerlane Bookkeeping Dublin", city: "Dublin" },
    africa: { name: "Ledgerlane Bookkeeping Nairobi", city: "Nairobi" },
    asia: { name: "Ledgerlane Bookkeeping Mumbai", city: "Mumbai" },
  },
  "course-advisor": {
    us: { name: "Trailhead Career College", city: "Austin, TX" },
    eu: { name: "Trailhead Career College Lisbon", city: "Lisbon" },
    africa: { name: "Trailhead Career College Lagos", city: "Lagos" },
    asia: { name: "Trailhead Career College Jakarta", city: "Jakarta" },
  },
  "dental-practice": {
    us: { name: "Oak Street Dental", city: "Austin, TX" },
    eu: { name: "Oak Street Dental Berlin", city: "Berlin" },
    africa: { name: "Oak Street Dental Rosebank", city: "Johannesburg" },
    asia: { name: "Oak Street Dental Orchard", city: "Singapore" },
  },
  "field-service": {
    us: { name: "Fieldline HVAC & Plumbing", city: "Austin, TX" },
    eu: { name: "Fieldline Service GmbH", city: "Munich" },
    africa: { name: "Fieldline Service Nairobi", city: "Nairobi" },
    asia: { name: "Fieldline Service Singapore", city: "Singapore" },
  },
  "fleet-driver": {
    us: { name: "Central Texas Fleet Desk", city: "Austin, TX" },
    eu: { name: "Rhine Fleet Desk", city: "Cologne" },
    africa: { name: "Gauteng Fleet Desk", city: "Johannesburg" },
    asia: { name: "Harbour Fleet Desk", city: "Singapore" },
  },
  "front-desk": {
    us: { name: "Summit Professional Suites", city: "Austin, TX" },
    eu: { name: "Summit Business Centre Berlin", city: "Berlin" },
    africa: { name: "Summit Business Centre Sandton", city: "Johannesburg" },
    asia: { name: "Summit Business Centre Singapore", city: "Singapore" },
  },
  "grant-stock-planner": {
    us: { name: "GrantDay Market — Austin", city: "Austin, TX" },
    eu: { name: "BenefitDay Market — Berlin", city: "Berlin" },
    africa: { name: "GrantDay Market — Soweto", city: "Johannesburg" },
    asia: { name: "BenefitDay Market — Jurong", city: "Singapore" },
  },
  "hotel-concierge": {
    us: { name: "Riverbend Inn Austin", city: "Austin, TX" },
    eu: { name: "Riverbend Inn Amsterdam", city: "Amsterdam" },
    africa: { name: "Riverbend Inn Cape Town", city: "Cape Town" },
    asia: { name: "Riverbend Inn Singapore", city: "Singapore" },
  },
  "hr-helpdesk": {
    us: { name: "Cedarworks People Ops", city: "Austin, TX" },
    eu: { name: "Cedarworks People Ops Berlin", city: "Berlin" },
    africa: { name: "Cedarworks People Ops Johannesburg", city: "Johannesburg" },
    asia: { name: "Cedarworks People Ops Singapore", city: "Singapore" },
  },
  "insurance-broker": {
    us: { name: "Summit Ridge Insurance Brokers", city: "Austin, TX" },
    eu: { name: "Summit Ridge Brokers Berlin", city: "Berlin" },
    africa: { name: "Summit Ridge Brokers Johannesburg", city: "Johannesburg" },
    asia: { name: "Summit Ridge Brokers Singapore", city: "Singapore" },
  },
  "insurance-claims": {
    us: { name: "Harbor Mutual Claims", city: "Austin, TX" },
    eu: { name: "Harbor Mutual Claims Berlin", city: "Berlin" },
    africa: { name: "Harbor Mutual Claims Johannesburg", city: "Johannesburg" },
    asia: { name: "Harbor Mutual Claims Singapore", city: "Singapore" },
  },
  "law-firm-intake": {
    us: { name: "Riverstone & Hale LLP", city: "Austin, TX" },
    eu: { name: "Riverstone & Hale Berlin", city: "Berlin" },
    africa: { name: "Riverstone & Hale Johannesburg", city: "Johannesburg" },
    asia: { name: "Riverstone & Hale Singapore", city: "Singapore" },
  },
  "loan-prequalifier": {
    us: { name: "ClearPath Personal Lending", city: "Austin, TX" },
    eu: { name: "ClearPath Lending Berlin", city: "Berlin" },
    africa: { name: "ClearPath Lending Johannesburg", city: "Johannesburg" },
    asia: { name: "ClearPath Lending Singapore", city: "Singapore" },
  },
  "loyalty-rewards": {
    us: { name: "Oak & Ember Rewards", city: "Austin, TX" },
    eu: { name: "Oak & Ember Rewards Berlin", city: "Berlin" },
    africa: { name: "Oak & Ember Rewards Johannesburg", city: "Johannesburg" },
    asia: { name: "Oak & Ember Rewards Singapore", city: "Singapore" },
  },
  "marketing-assistant": {
    us: { name: "Hearth & Pantry Co.", city: "Austin, TX" },
    eu: { name: "Hearth & Pantry Berlin", city: "Berlin" },
    africa: { name: "Hearth & Pantry Johannesburg", city: "Johannesburg" },
    asia: { name: "Hearth & Pantry Singapore", city: "Singapore" },
  },
  "mobile-money": {
    us: { name: "Riverbend Cash Services", city: "Austin, TX" },
    eu: { name: "Riverbend Cash Berlin", city: "Berlin" },
    africa: { name: "Riverbend Mobile Money Johannesburg", city: "Johannesburg" },
    asia: { name: "Riverbend Pay Singapore", city: "Singapore" },
  },
  "order-tracking": {
    us: { name: "Northline Home Goods", city: "Austin, TX" },
    eu: { name: "Northline Home Goods Berlin", city: "Berlin" },
    africa: { name: "Northline Home Goods Johannesburg", city: "Johannesburg" },
    asia: { name: "Northline Home Goods Singapore", city: "Singapore" },
  },
  "payment-disputes": {
    us: { name: "Northline Payments Desk", city: "Austin, TX" },
    eu: { name: "Northline Payments Berlin", city: "Berlin" },
    africa: { name: "Northline Payments Johannesburg", city: "Johannesburg" },
    asia: { name: "Northline Payments Singapore", city: "Singapore" },
  },
  "payroll-queries": {
    us: { name: "Cedarworks Inc.", city: "Austin, TX" },
    eu: { name: "Cedarworks GmbH", city: "Berlin" },
    africa: { name: "Cedarworks (Pty) Ltd", city: "Johannesburg" },
    asia: { name: "Cedarworks Pte Ltd", city: "Singapore" },
  },
  "policy-compliance": {
    us: { name: "Cedarworks Compliance Desk", city: "Austin, TX" },
    eu: { name: "Cedarworks Compliance Berlin", city: "Berlin" },
    africa: { name: "Cedarworks Compliance Johannesburg", city: "Johannesburg" },
    asia: { name: "Cedarworks Compliance Singapore", city: "Singapore" },
  },
  procurement: {
    us: { name: "Cedarworks Procurement Desk", city: "Austin, TX" },
    eu: { name: "Cedarworks Procurement Berlin", city: "Berlin" },
    africa: { name: "Cedarworks Procurement Johannesburg", city: "Johannesburg" },
    asia: { name: "Cedarworks Procurement Singapore", city: "Singapore" },
  },
  "product-finder": {
    us: { name: "Homestead & Hearth", city: "Austin, TX" },
    eu: { name: "Homestead & Hearth Berlin", city: "Berlin" },
    africa: { name: "Homestead & Hearth Johannesburg", city: "Johannesburg" },
    asia: { name: "Homestead & Hearth Singapore", city: "Singapore" },
  },
  "property-enquiries": {
    us: { name: "Cedarline Realty", city: "Austin, TX" },
    eu: { name: "Cedarline Realty Berlin", city: "Berlin" },
    africa: { name: "Cedarline Realty Johannesburg", city: "Johannesburg" },
    asia: { name: "Cedarline Realty Singapore", city: "Singapore" },
  },
  remittance: {
    us: { name: "HarborSend", city: "Austin, TX" },
    eu: { name: "HarborSend Berlin", city: "Berlin" },
    africa: { name: "HarborSend Johannesburg", city: "Johannesburg" },
    asia: { name: "HarborSend Singapore", city: "Singapore" },
  },
  "rental-enquiries": {
    us: { name: "Oak & Key Lettings", city: "Austin, TX" },
    eu: { name: "Oak & Key Lettings Berlin", city: "Berlin" },
    africa: { name: "Oak & Key Lettings Johannesburg", city: "Johannesburg" },
    asia: { name: "Oak & Key Lettings Singapore", city: "Singapore" },
  },
  "returns-exchanges": {
    us: { name: "Homestead & Hearth", city: "Austin, TX" },
    eu: { name: "Homestead & Hearth Berlin", city: "Berlin" },
    africa: { name: "Homestead & Hearth Johannesburg", city: "Johannesburg" },
    asia: { name: "Homestead & Hearth Singapore", city: "Singapore" },
  },
  "spaza-merchant": {
    us: { name: "Cesar Corner Market", city: "Austin, TX" },
    eu: { name: "Corner Kiosk Berlin", city: "Berlin" },
    africa: { name: "Cesar Spaza — Soweto", city: "Johannesburg" },
    asia: { name: "Cesar Convenience — Jurong", city: "Singapore" },
  },
  "stock-availability": {
    us: { name: "Ridgeway Outfitters", city: "Austin, TX" },
    eu: { name: "Ridgeway Outfitters Berlin", city: "Berlin" },
    africa: { name: "Ridgeway Outfitters Johannesburg", city: "Johannesburg" },
    asia: { name: "Ridgeway Outfitters Singapore", city: "Singapore" },
  },
  "student-helpdesk": {
    us: { name: "Laguna Community College", city: "Austin, TX" },
    eu: { name: "Laguna College Berlin", city: "Berlin" },
    africa: { name: "Laguna College Johannesburg", city: "Johannesburg" },
    asia: { name: "Laguna College Singapore", city: "Singapore" },
  },
  "tour-activity": {
    us: { name: "Hill Country Trails", city: "Austin, TX" },
    eu: { name: "Alpine Trails Berlin", city: "Berlin" },
    africa: { name: "Table Mountain Trails", city: "Cape Town" },
    asia: { name: "Harbour Trails Singapore", city: "Singapore" },
  },
  "travel-desk": {
    us: { name: "Meridian Travel Desk", city: "Austin, TX" },
    eu: { name: "Meridian Travel Desk Berlin", city: "Berlin" },
    africa: { name: "Meridian Travel Desk Johannesburg", city: "Johannesburg" },
    asia: { name: "Meridian Travel Desk Singapore", city: "Singapore" },
  },
  "utility-billing": {
    us: { name: "Riverside Municipal Utilities", city: "Austin, TX" },
    eu: { name: "Riverside Stadtwerke Berlin", city: "Berlin" },
    africa: { name: "Riverside Municipal Utilities Johannesburg", city: "Johannesburg" },
    asia: { name: "Riverside Utilities Singapore", city: "Singapore" },
  },
  "vas-concierge": {
    us: { name: "BrightPin Digital", city: "Austin, TX" },
    eu: { name: "BrightPin Digital Berlin", city: "Berlin" },
    africa: { name: "BrightPin Digital Johannesburg", city: "Johannesburg" },
    asia: { name: "BrightPin Digital Singapore", city: "Singapore" },
  },
  veterinary: {
    us: { name: "Paws & Claws Veterinary Clinic", city: "Austin, TX" },
    eu: { name: "Paws & Claws Berlin", city: "Berlin" },
    africa: { name: "Paws & Claws Johannesburg", city: "Johannesburg" },
    asia: { name: "Paws & Claws Singapore", city: "Singapore" },
  },
};

const MARKET_META = {
  eu: {
    currency: "EUR",
    currencySymbol: "€",
    emergency: "112",
    region: "European Union",
    label: "EU",
    timezone: "Central European Time",
    tzShort: "CET",
    languagesLine: "English, German, French, Spanish, or Italian",
    channelsLine: "SMS, web chat, and the app",
  },
  africa: {
    currency: "local currency",
    currencySymbol: "",
    emergency: "local emergency services",
    region: "Africa",
    label: "Africa",
    timezone: "local time",
    tzShort: "local time",
    languagesLine: "English, French, or Swahili",
    channelsLine: "WhatsApp (primary), web chat, the app, and SMS",
  },
  asia: {
    currency: "local currency",
    currencySymbol: "",
    emergency: "local emergency services",
    region: "Asia",
    label: "Asia",
    timezone: "local time",
    tzShort: "local time",
    languagesLine: "English, Chinese, or Hindi",
    channelsLine: "web chat, the app, and SMS",
  },
};

function stripComplianceBlocks(text) {
  if (!text) return text;
  return text
    .replace(/\n*## (US|EU|Africa|Asia) compliance notes[\s\S]*?(?=\n## |\nToday's date|\s*$)/gi, "\n")
    .replace(/\n*## Market operations appendix \([^)]+\)[\s\S]*?(?=\n## |\nToday's date|\s*$)/gi, "\n")
    .replace(/\n*## Market locale \([^)]+\)[\s\S]*?(?=\n## |\s*$)/gi, "\n")
    .trimEnd();
}

function stripEvalPollution(text) {
  if (!text || typeof text !== "string") return text;
  // generate:packs wrongly appended compliance notes into eval inputs
  return text.replace(/\n*## (US|EU|Africa|Asia) compliance notes[\s\S]*$/i, "").trim();
}

function moneyReplace(text, meta) {
  let out = text;
  if (meta.currencySymbol === "€") {
    out = out.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, "€$1");
    out = out.replace(/\bUSD\b/g, "EUR");
  } else {
    // Africa / Asia — keep numeric amounts, drop USD/$ label
    out = out.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, "$1 (local currency)");
    out = out.replace(/\bUSD\b/g, "local currency");
  }
  return out;
}

function localizeBody(text, family, market, pack, usTenant, destTenant) {
  if (!text) return text;
  const meta = MARKET_META[market];
  let out = stripComplianceBlocks(text);

  // Tenant / geography
  out = out.replace(/Austin,\s*TX/gi, destTenant.city);
  out = out.replace(/Austin\b/g, destTenant.city.split(",")[0]);
  out = out.replace(/Central Texas/gi, destTenant.city);
  out = out.replace(/Travis Heights|South Congress|Barton Creek|Lady Bird Lake|Domain\b/gi, destTenant.city);
  out = out.replace(/1200 Congress Ave[^"]*/gi, `${destTenant.city} campus address (replace per tenant)`);
  out = out.replace(/512-555-\d{4}/g, destTenant.phone || "+00 000 000 0000");
  out = out.replace(/\+1\s*512[^\n,]*/g, destTenant.phone || "+00 000 000 0000");

  if (usTenant?.name && destTenant.name && usTenant.name !== destTenant.name) {
    out = out.replace(new RegExp(escapeReg(usTenant.name), "g"), destTenant.name);
  }

  // Common US brand → regional (from TENANTS us names when present in text)
  for (const [fam, t] of Object.entries(TENANTS)) {
    if (t.us?.name && t[market]?.name && t.us.name !== t[market].name) {
      out = out.replace(new RegExp(escapeReg(t.us.name), "g"), t[market].name);
    }
  }

  // Region labels
  out = out.replace(/\bUnited States\b/g, meta.region);
  out = out.replace(/\bUS college\b/g, `${meta.label} college`);
  out = out.replace(/\bUS\b/g, meta.label);
  out = out.replace(/Central Time/gi, meta.timezone);
  out = out.replace(/\bCT\b/g, meta.tzShort);
  out = out.replace(/\bFAFSA\b/g, market === "eu" ? "student finance" : "student funding");
  out = out.replace(/\bGED\b/g, market === "eu" ? "secondary-school leaving certificate" : "secondary certificate / equivalent");
  out = out.replace(/\bCapMetro\b/gi, "local transit");
  out = out.replace(/\bHIPAA\b/g, market === "eu" ? "health data protection" : "health privacy rules");
  out = out.replace(/\bTCPA\b/g, "messaging consent rules");
  out = out.replace(/\bCCPA\b/g, pack.privacyLabel || "privacy law");
  out = out.replace(/\bSSI\b|\bSNAP\b|\bEBT\b/g, market === "africa" ? "social grant / benefit day" : "benefit payment day");
  out = out.replace(/Verizon/gi, market === "eu" ? "local mobile carriers" : "local mobile carriers");
  out = out.replace(/Franklin Barbecue/gi, `${destTenant.city} local dining`);

  out = moneyReplace(out, meta);
  out = out.replace(/\b911\b/g, meta.emergency);
  out = out.replace(/English or Spanish/gi, meta.languagesLine);
  out = out.replace(/voice, SMS, web chat, and the app/gi, meta.channelsLine);
  out = out.replace(/SMS, web chat, and the app/gi, meta.channelsLine);
  out = out.replace(/over voice, SMS, web chat, and the app/gi, `over ${meta.channelsLine}`);

  // Title line in knowledge
  out = out.replace(/^# US /m, `# ${meta.label} `);
  out = out.replace(/^# Africa /m, `# ${meta.label} `);
  out = out.replace(/^# EU /m, `# ${meta.label} `);
  out = out.replace(/^# Asia /m, `# ${meta.label} `);

  const compliance = pack.complianceNotes.trim();
  const appendix = [
    ``,
    `## ${meta.label} compliance notes`,
    compliance.replace(/^## [^\n]+\n/, "").trim(),
    ``,
    `## Market locale (${meta.label})`,
    `- Example tenant: **${destTenant.name}** — ${destTenant.city} (replace per customer).`,
    `- Currency: ${meta.currency}${meta.currencySymbol ? ` (${meta.currencySymbol})` : ""}. Emergency: **${meta.emergency}**.`,
    `- Channels: ${meta.channelsLine}. Languages: ${meta.languagesLine}.`,
    `- Confirm-before-write and human handoff rules from the system prompt still apply.`,
  ].join("\n");

  if (!out.includes(`## ${meta.label} compliance notes`)) {
    out = out.trimEnd() + "\n" + appendix + "\n";
  }

  return out;
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizeEvals(evals, family, market, pack, usTenant, destTenant) {
  if (!Array.isArray(evals)) return evals;
  return evals.map((e) => {
    if (!e || typeof e !== "object") return e;
    const copy = { ...e };
    for (const key of Object.keys(copy)) {
      if (typeof copy[key] === "string") {
        let v = stripEvalPollution(copy[key]);
        v = localizeBody(v, family, market, pack, usTenant, destTenant);
        // Don't re-append full compliance blocks into short eval strings
        v = stripComplianceBlocks(v);
        v = v.replace(/\n*## Market locale[\s\S]*$/i, "").trim();
        copy[key] = v;
      } else if (Array.isArray(copy[key])) {
        copy[key] = copy[key].map((item) => {
          if (typeof item !== "string") return item;
          let v = stripEvalPollution(item);
          v = moneyReplace(v, MARKET_META[market]);
          v = v.replace(/\b911\b/g, MARKET_META[market].emergency);
          v = v.replace(/Austin/gi, destTenant.city.split(",")[0]);
          v = v.replace(/\$(\d)/g, MARKET_META[market].currencySymbol === "€" ? "€$1" : "$1");
          // Fix mangled USD 911 style artifacts from earlier generate
          v = v.replace(/USD\s*911/g, MARKET_META[market].emergency);
          v = v.replace(/\$911/g, MARKET_META[market].emergency);
          v = v.replace(/USD\s*0001/g, "0001");
          v = v.replace(/USD\s*2026/g, "2026");
          v = v.replace(/USD\s*250/g, MARKET_META[market].currencySymbol === "€" ? "€250" : "250");
          return v;
        });
      }
    }
    return copy;
  });
}

function deepenPack(family, market, packsById) {
  if (CLUSTER_B_PROTECTED.has(family)) {
    throw new Error(`Refusing to overwrite Cluster B pack: ${market}-${family} (Claude lane)`);
  }
  const usPath = path.join(catalogDir, `us-${family}.agent.json`);
  const outPath = path.join(catalogDir, `${market}-${family}.agent.json`);
  const us = JSON.parse(fs.readFileSync(usPath, "utf8"));
  const pack = packsById[market];
  const meta = MARKET_META[market];
  const tenants = TENANTS[family];
  if (!tenants) throw new Error(`No TENANTS entry for ${family}`);
  const usTenant = tenants.us;
  const destTenant = tenants[market];

  const health = /dental|veterinary|clinic|pharmacy|health/i.test(family);
  const compliance = health && pack.healthCompliance ? pack.healthCompliance : pack.compliance;

  const baseName = (us.manifest.name || family).replace(/^(US|EU|Africa|Asia)\s+/i, "").trim();
  const system_prompt = localizeBody(us.system_prompt, family, market, pack, usTenant, destTenant);
  const knowledge = localizeBody(us.knowledge, family, market, pack, usTenant, destTenant);
  const guardrails = localizeBody(us.guardrails || "", family, market, pack, usTenant, destTenant);
  const evals = localizeEvals(us.evals, family, market, pack, usTenant, destTenant);

  // Ensure confirm-before-write + handoff cues survive
  let prompt = system_prompt;
  if (!/confirm before you write/i.test(prompt)) {
    prompt +=
      "\n\n## Confirm before you write\nSide-effect tools require a clear confirmation. Read back key fields and wait for an explicit yes before calling a write tool.\n";
  }
  if (!/clear handoff|handoff_to_human/i.test(prompt)) {
    prompt += `\n\n## Clear handoff\nCall \`handoff_to_human\` for out-of-scope, sensitive, emergency (after **${meta.emergency}**), person-request, or low-confidence cases.\n`;
  }

  const pkg = {
    format: us.format || "miai.agent-package/v1",
    manifest: {
      ...us.manifest,
      id: `${market}-${family}`,
      name: `${pack.namePrefix}${baseName}`.replace(/\s+/g, " ").trim(),
      version: "1.1.0",
      market,
      compliance: [...compliance],
      channels: [...pack.channels],
      languages: [...pack.languages],
      summary: `${meta.label} ${baseName} for ${destTenant.name} (${destTenant.city}) — localized production pack with confirm-before-write and human handoff.`,
    },
    system_prompt: prompt,
    knowledge,
    tools: us.tools,
    guardrails,
    evals,
  };

  // Soft-localize prepaid labels
  if (pkg.manifest.prepaid?.skus) {
    pkg.manifest.prepaid = {
      ...pkg.manifest.prepaid,
      skus: pkg.manifest.prepaid.skus.map((s) => ({
        ...s,
        label: (s.label || "").replace(/^(US|EU|Africa|Asia)\s+/i, pack.namePrefix),
        price_band:
          market === "eu"
            ? (s.price_band || "").replace(/\$/g, "€").replace(/USD/g, "EUR")
            : (s.price_band || "").replace(/\$[\d.–-]+|USD\s*[\d.–-]+/gi, "local band") || "local band",
      })),
    };
  }

  fs.writeFileSync(outPath, JSON.stringify(pkg, null, 2) + "\n");
  return { outPath, tenant: destTenant.name, evals: Array.isArray(evals) ? evals.length : 0 };
}

function updatePilotDoc(family) {
  const p = path.join(pilotsDir, `${family}.md`);
  if (!fs.existsSync(p)) return;
  let md = fs.readFileSync(p, "utf8");
  const t = TENANTS[family];
  const block = [
    "",
    "## Markets",
    `- **EU** (\`eu-${family}\`): ${t.eu.name} (${t.eu.city}); currency EUR; compliance GDPR; emergency 112.`,
    `- **Africa** (\`africa-${family}\`): ${t.africa.name} (${t.africa.city}); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.`,
    `- **Asia** (\`asia-${family}\`): ${t.asia.name} (${t.asia.city}); PDPA / regional privacy; local currency; local emergency services.`,
    "",
  ].join("\n");

  if (/^## Markets\b/m.test(md)) {
    md = md.replace(/## Markets[\s\S]*?(?=\n## |\s*$)/, block.trim() + "\n");
  } else {
    md = md.trimEnd() + "\n" + block;
  }
  fs.writeFileSync(p, md.endsWith("\n") ? md : md + "\n");
}

function main() {
  const arg = process.argv.find((a) => a.startsWith("--cluster="));
  const cluster = (arg?.split("=")[1] || "all").toLowerCase();
  let families;
  if (cluster === "all") {
    families = [...CLUSTERS.d, ...CLUSTERS.e, ...CLUSTERS.f];
  } else if (cluster === "ac") {
    families = [...CLUSTERS.a, ...CLUSTERS.c];
  } else {
    families = CLUSTERS[cluster];
  }
  if (!families) {
    console.error("Unknown cluster. Use a|c|d|e|f|ac|all");
    process.exit(1);
  }

  const packConfig = JSON.parse(fs.readFileSync(packsFile, "utf8"));
  const packsById = Object.fromEntries(packConfig.packs.map((p) => [p.id, p]));

  let n = 0;
  for (const family of families) {
    for (const market of ["eu", "africa", "asia"]) {
      const r = deepenPack(family, market, packsById);
      n++;
      console.log(`deepened ${market}-${family} → ${r.tenant} (${r.evals} evals)`);
    }
    updatePilotDoc(family);
  }
  console.log(`\nDone. deepened=${n} packs across ${families.length} families (cluster=${cluster}).`);
}

main();
