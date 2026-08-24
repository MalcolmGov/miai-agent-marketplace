export interface WalletBalance {
  workspaceId: string;
  tokens: number;
  currencyLabel: string;
}

export interface DebitRequest {
  workspaceId: string;
  amount: number;
  idempotencyKey: string;
  reason: string;
  agentId?: string;
}

export interface DebitResult {
  ok: boolean;
  balance: number;
  paused: boolean;
  error?: string;
}

/** Prepaid top-up tiers (USD). No subscription/rental — one-time credit only. */
export type TopUpPackageId = "5" | "10" | "20" | "50" | "100" | "200";

export interface TopUpRequest {
  workspaceId: string;
  usdAmount: number;
  packageId: TopUpPackageId;
  /**
   * Optional idempotency key (e.g. the Paystack transaction reference). A repeat
   * with the same key returns the current balance WITHOUT crediting again — so a
   * webhook retry and the return-URL verifier can both fire safely.
   */
  idempotencyKey?: string;
}

export interface WalletAdapter {
  getBalance(workspaceId: string): Promise<WalletBalance>;
  debit(req: DebitRequest): Promise<DebitResult>;
  topUp(req: TopUpRequest): Promise<WalletBalance>;
}

/**
 * Tokens granted per USD package. Larger packages carry a better token/$ rate
 * (volume bonus), same curve as the prototype: 13k/$ at $5 rising to 34.5k/$ at $200.
 */
export const TOPUP_TOKENS: Record<TopUpPackageId, number> = {
  "5": 65_000,
  "10": 150_000,
  "20": 420_000, // +5% bonus
  "50": 1_250_000,
  "100": 2_750_000,
  "200": 6_900_000,
};

export interface TopUpPackage {
  id: TopUpPackageId;
  usd: number;
  tokens: number;
}

/** Single source of truth for the top-up package menu — shared by UI and payment routes. */
export const TOPUP_PACKAGES: TopUpPackage[] = (
  Object.keys(TOPUP_TOKENS) as TopUpPackageId[]
).map((id) => ({ id, usd: Number(id), tokens: TOPUP_TOKENS[id] }));

/** Resolve a package id → USD amount (the numeric id IS the USD amount). */
export function usdForPackage(packageId: TopUpPackageId): number {
  return Number(packageId);
}

/** In-memory mock wallet — swap for MyInstantAI HTTP client when APIs exist. */
export class MockWalletAdapter implements WalletAdapter {
  private balances = new Map<string, number>();
  private seen = new Set<string>();
  private defaultTokens: number;

  constructor(defaultTokens = 1_000_000) {
    this.defaultTokens = defaultTokens;
    this.balances.set("demo-workspace", defaultTokens);
  }

  async getBalance(workspaceId: string): Promise<WalletBalance> {
    if (!this.balances.has(workspaceId)) this.balances.set(workspaceId, this.defaultTokens);
    return {
      workspaceId,
      tokens: this.balances.get(workspaceId)!,
      currencyLabel: "PREPAID",
    };
  }

  async debit(req: DebitRequest): Promise<DebitResult> {
    if (this.seen.has(req.idempotencyKey)) {
      const bal = (await this.getBalance(req.workspaceId)).tokens;
      return { ok: true, balance: bal, paused: bal <= 0 };
    }
    const current = (await this.getBalance(req.workspaceId)).tokens;
    if (current < req.amount) {
      return {
        ok: false,
        balance: current,
        paused: true,
        error: "Insufficient tokens",
      };
    }
    const next = current - req.amount;
    this.balances.set(req.workspaceId, next);
    this.seen.add(req.idempotencyKey);
    return { ok: true, balance: next, paused: next <= 0 };
  }

  async topUp(req: TopUpRequest): Promise<WalletBalance> {
    // Idempotent on the payment reference: a webhook retry (or the return-URL
    // verifier racing the webhook) must not credit twice.
    if (req.idempotencyKey && this.seen.has(req.idempotencyKey)) {
      return this.getBalance(req.workspaceId);
    }
    const add = TOPUP_TOKENS[req.packageId];
    const current = (await this.getBalance(req.workspaceId)).tokens;
    this.balances.set(req.workspaceId, current + add);
    if (req.idempotencyKey) this.seen.add(req.idempotencyKey);
    return this.getBalance(req.workspaceId);
  }
}

export class HttpWalletAdapter implements WalletAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
          ...(init?.headers ?? {}),
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.request(path, init);
    if (!res.ok) throw new Error(`Wallet API ${res.status}`);
    return res.json() as Promise<T>;
  }

  getBalance(workspaceId: string) {
    return this.json<WalletBalance>(`/v1/wallets/${workspaceId}`);
  }

  async debit(req: DebitRequest): Promise<DebitResult> {
    const res = await this.request(`/v1/wallets/${req.workspaceId}/debit`, {
      method: "POST",
      headers: { "idempotency-key": req.idempotencyKey },
      body: JSON.stringify(req),
    });

    // Insufficient funds / pause-on-zero — do not throw; mirror MockWalletAdapter.
    if (res.status === 402 || res.status === 409) {
      let balance = 0;
      let error = `Wallet API ${res.status}`;
      try {
        const body = (await res.json()) as Partial<DebitResult> & { message?: string };
        if (typeof body.balance === "number") balance = body.balance;
        error = body.error ?? body.message ?? error;
      } catch {
        /* ignore body parse */
      }
      return { ok: false, balance, paused: true, error };
    }

    if (!res.ok) throw new Error(`Wallet API ${res.status}`);
    return res.json() as Promise<DebitResult>;
  }

  topUp(req: TopUpRequest) {
    return this.json<WalletBalance>(`/v1/wallets/${req.workspaceId}/topup`, {
      method: "POST",
      // The backend dedupes on this header so a webhook retry never double-credits.
      headers: req.idempotencyKey ? { "idempotency-key": req.idempotencyKey } : undefined,
      body: JSON.stringify(req),
    });
  }
}

function env(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

const g = globalThis as typeof globalThis & { __miaiWallet?: WalletAdapter };

/** Singleton wallet (mock balances persist across turns in one process). */
export function createWalletAdapter(): WalletAdapter {
  if (g.__miaiWallet) return g.__miaiWallet;
  const mode = env("MIAI_WALLET_MODE") ?? "mock";
  const url = env("MIAI_WALLET_API_URL");
  if (mode === "http" && url) {
    g.__miaiWallet = new HttpWalletAdapter(url, env("MIAI_WALLET_API_KEY") ?? "");
  } else {
    g.__miaiWallet = new MockWalletAdapter();
  }
  return g.__miaiWallet;
}

export function resetWalletAdapterForTests(): void {
  delete g.__miaiWallet;
}

/** Rough token burn by model alias (prototype multipliers). */
export function estimateTurnTokens(model: string, charsIn: number, charsOut: number): number {
  const base = Math.max(200, Math.round((charsIn + charsOut) / 4));
  const mult =
    /flash/i.test(model) ? 0.4 :
    /mini/i.test(model) ? 0.5 :
    /opus/i.test(model) ? 3 :
    /gpt-4o(?!-mini)/i.test(model) ? 1.6 :
    1;
  return Math.round(base * mult);
}
