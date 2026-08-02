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
  shouldRetry?: (err: unknown) => boolean;
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
  const shouldRetry = opts.shouldRetry ?? isRetryableError;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries || !shouldRetry(err)) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}
