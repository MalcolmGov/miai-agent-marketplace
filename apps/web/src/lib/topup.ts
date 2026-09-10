import { randomUUID } from "node:crypto";
import {
  createWalletAdapter,
  usdForPackage,
  type TopUpPackageId,
} from "@miai/wallet-adapter";
import { appendAudit } from "@/lib/store";
import { currency, toMinorUnits } from "@/lib/paystack";

/**
 * Wallet top-up plumbing shared by the Paystack init / webhook / return routes.
 *
 * References are namespaced `wtu_` so the (potentially shared) webhook can route a
 * wallet charge to the token ledger and skip anything else. Crediting is idempotent
 * on the Paystack reference — the webhook and the return-URL verifier can both fire,
 * and Paystack can retry a webhook, without ever double-crediting. Mirrors the
 * aria (Zara) integration's wallet/topup.py so the two products behave identically.
 */

export const REF_PREFIX = "wtu_";

export function isWalletReference(reference: string): boolean {
  return String(reference || "").startsWith(REF_PREFIX);
}

/** A fresh, Paystack-safe reference (alphanumerics only) for a wallet top-up. */
export function newTopupReference(): string {
  return `${REF_PREFIX}${randomUUID().replace(/-/g, "")}`;
}

export type TopUpScope = "workspace" | "consumer";

export interface TopUpMetadata {
  purpose: "wallet_topup";
  walletId: string;
  packageId: TopUpPackageId;
  scope: TopUpScope;
  [k: string]: unknown;
}

const VALID_PACKAGE_IDS: TopUpPackageId[] = ["5", "10", "20", "50", "100", "200"];

function asPackageId(v: unknown): TopUpPackageId | null {
  return VALID_PACKAGE_IDS.includes(v as TopUpPackageId) ? (v as TopUpPackageId) : null;
}

/**
 * Credit the token ledger from a verified Paystack charge payload (webhook or the
 * verify API). Returns the new token balance, or null when the charge isn't a
 * wallet top-up / isn't successful / is missing routing metadata.
 *
 * The wallet credited is the one named in the VERIFIED metadata — never the caller —
 * so an unauthenticated return-URL hit can't redirect a credit to someone else.
 */
export async function applyTopupFromPaystack(data: {
  reference?: string;
  status?: string;
  amount?: number; // minor units actually paid (webhook payload / verify API)
  currency?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<{ credited: boolean; tokens: number } | null> {
  const reference = String(data.reference || "");
  const meta = (data.metadata || {}) as Record<string, unknown>;
  // Route ONLY on our server-issued `wtu_` reference. The old `|| meta.purpose === "wallet_topup"`
  // fallback trusted attacker-chosen metadata: any charge could enter the wallet-credit path.
  if (!isWalletReference(reference)) return null;

  const status = String(data.status || "success").toLowerCase();
  if (status !== "success" && status !== "successful") return null;

  const walletId = String(meta.walletId || "");
  const packageId = asPackageId(meta.packageId);
  if (!walletId || !packageId) return null;

  const usd = usdForPackage(packageId);

  // Credit is decided by the metadata packageId, so it MUST be bound to the amount actually paid —
  // otherwise a buyer could initialize a 1-cent charge with packageId:"200" in metadata (the public
  // key allows arbitrary client-set amounts) and, on the genuinely-signed webhook, be credited $200
  // of tokens. HMAC only proves the event came from Paystack, not that the package price was paid.
  const paidMinor = Number(data.amount);
  const expectedMinor = toMinorUnits(usd);
  if (!Number.isFinite(paidMinor) || paidMinor !== expectedMinor) return null;
  if (String(data.currency || "").toUpperCase() !== currency()) return null;

  const wallet = createWalletAdapter();
  // idempotencyKey = the Paystack reference → a retry returns the balance uncredited.
  const balance = await wallet.topUp({
    workspaceId: walletId,
    packageId,
    usdAmount: usd,
    idempotencyKey: reference,
  });

  await appendAudit({
    workspaceId: walletId,
    type: "wallet_topup",
    detail: {
      provider: "paystack",
      reference,
      packageId,
      usd,
      scope: String(meta.scope || ""),
      balance: balance.tokens,
    },
  });

  return { credited: true, tokens: balance.tokens };
}
