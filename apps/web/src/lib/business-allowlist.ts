/**
 * Business access allowlist — the invite-only gate applied at the OIDC callback, BEFORE any session
 * is issued. This is the single choke point that decides which verified Google identities may obtain
 * a business session and enter the console.
 *
 * Fail-closed: if NEITHER MIAI_B2B_ALLOWED_EMAILS nor MIAI_B2B_ALLOWED_DOMAINS is set, nobody is
 * admitted — so turning on business OIDC never silently admits any Google account. Set at least one
 * to admit people.
 *
 *   MIAI_B2B_ALLOWED_EMAILS  = comma list of exact addresses (e.g. "ceo@acme.com,ops@acme.com")
 *   MIAI_B2B_ALLOWED_DOMAINS = comma list of domains (e.g. "acme.com,partner.co"); subdomains match
 */

function csv(name: string): string[] {
  return (process.env[name] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when `email` is on the invite allowlist and Google has verified it. Requires a verified
 * email so an unverified address can't spoof a whitelisted domain.
 */
export function isBusinessEmailAllowed(emailRaw?: string, emailVerified?: boolean): boolean {
  const email = (emailRaw || "").trim().toLowerCase();
  if (!email.includes("@") || emailVerified !== true) return false;

  const emails = csv("MIAI_B2B_ALLOWED_EMAILS");
  const domains = csv("MIAI_B2B_ALLOWED_DOMAINS");
  if (emails.length === 0 && domains.length === 0) return false; // fail closed

  if (emails.includes(email)) return true;

  const domain = email.slice(email.indexOf("@") + 1);
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`));
}
