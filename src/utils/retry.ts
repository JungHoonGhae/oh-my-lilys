export type SleepFn = (ms: number) => Promise<void>;
export type RandomFn = () => number;

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
  sleep?: SleepFn;
  random?: RandomFn;
  shouldRetry: (error: unknown) => boolean;
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function computeBackoffMs(
  attempt: number,
  options: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "jitterRatio">,
  random: RandomFn
): number {
  const exp = 2 ** Math.max(0, attempt);
  const base = Math.min(options.maxDelayMs, options.baseDelayMs * exp);
  const jittered = base * (1 + options.jitterRatio * random());
  return Math.round(Math.min(options.maxDelayMs, jittered));
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const sleep: SleepFn = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const random: RandomFn = options.random ?? Math.random;

  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < options.maxRetries && options.shouldRetry(error);
      if (!shouldRetry) throw error;

      const delayMs = computeBackoffMs(attempt, options, random);
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}
