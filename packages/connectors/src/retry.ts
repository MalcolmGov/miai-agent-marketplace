/** HTTP statuses worth retrying (429 rate-limit, 5xx server errors). */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class HttpResponseError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpResponseError";
    this.status = status;
  }

  get retryable(): boolean {
    return isRetryableHttpStatus(this.status);
  }
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof HttpResponseError) return err.retryable;
  // fetch network failures (DNS, connection reset, etc.)
  if (err instanceof TypeError) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface WithRetryOptions {
  /** Total retries after the first attempt (default 2 → 3 attempts). */
  maxRetries?: number;
  /** Base delay before first retry in ms (default 300). */
  baseDelayMs?: number;
  /** Upper bound on any single backoff wait in ms (default 20000). */
  maxDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

/**
 * Full-jitter exponential backoff (AWS "Exponential Backoff And Jitter"): a random wait in
 * [0, min(maxDelay, base·2^attempt)). P2-8 — spreads many clients that fail at the same instant
 * across the window instead of synchronizing their retries into a thundering herd on a shared
 * upstream (gateway / connector / DB).
 */
export function backoffWithJitter(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}

/**
 * Retry an async operation on transient failures (429/5xx HTTP, network errors).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: WithRetryOptions = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 300;
  const maxDelayMs = opts.maxDelayMs ?? 20_000;
  const shouldRetry = opts.shouldRetry ?? isRetryableError;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries || !shouldRetry(err)) throw err;
      await sleep(backoffWithJitter(attempt, baseDelayMs, maxDelayMs));
    }
  }
  throw lastErr;
}
