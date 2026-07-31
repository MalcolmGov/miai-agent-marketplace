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

export interface TopUpRequest {
  workspaceId: string;
  usdAmount: number;
  packageId: "10" | "20" | "100" | "200";
}

export interface WalletAdapter {
  getBalance(workspaceId: string): Promise<WalletBalance>;
  debit(req: DebitRequest): Promise<DebitResult>;
  topUp(req: TopUpRequest): Promise<WalletBalance>;
}

const TOPUP_TOKENS: Record<TopUpRequest["packageId"], number> = {
  "10": 150_000,
  "20": 420_000, // includes +5% bonus like prototype
  "100": 2_750_000,
  "200": 6_900_000,
};

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
    const add = TOPUP_TOKENS[req.packageId];
    const current = (await this.getBalance(req.workspaceId)).tokens;
    this.balances.set(req.workspaceId, current + add);
    return this.getBalance(req.workspaceId);
  }
}

export class HttpWalletAdapter implements WalletAdapter {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`Wallet API ${res.status}`);
    return res.json() as Promise<T>;
  }

  getBalance(workspaceId: string) {
    return this.json<WalletBalance>(`/v1/wallets/${workspaceId}`);
  }

  debit(req: DebitRequest) {
    return this.json<DebitResult>(`/v1/wallets/${req.workspaceId}/debit`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  topUp(req: TopUpRequest) {
    return this.json<WalletBalance>(`/v1/wallets/${req.workspaceId}/topup`, {
      method: "POST",
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
