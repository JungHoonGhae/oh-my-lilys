import { test, expect } from "bun:test";

import {
  computeBackoffMs,
  isRetryableHttpStatus,
  withRetry,
} from "../utils/retry.js";

test("isRetryableHttpStatus retries on 429 and 5xx only", () => {
  expect(isRetryableHttpStatus(429)).toBe(true);
  expect(isRetryableHttpStatus(500)).toBe(true);
  expect(isRetryableHttpStatus(503)).toBe(true);
  expect(isRetryableHttpStatus(400)).toBe(false);
  expect(isRetryableHttpStatus(401)).toBe(false);
  expect(isRetryableHttpStatus(404)).toBe(false);
});

test("computeBackoffMs respects caps and jitter", () => {
  const random = () => 1;
  const opts = { baseDelayMs: 300, maxDelayMs: 5000, jitterRatio: 0.3 };

  expect(computeBackoffMs(0, opts, random)).toBe(390);
  expect(computeBackoffMs(1, opts, random)).toBe(780);
  expect(computeBackoffMs(10, opts, random)).toBe(5000);
});

test("withRetry retries up to maxRetries", async () => {
  let calls = 0;
  const sleepCalls: number[] = [];

  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new TypeError("Network error");
      return "ok";
    },
    {
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
      jitterRatio: 0,
      random: () => 0,
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
      shouldRetry: (e) => e instanceof TypeError,
    }
  );

  expect(result).toBe("ok");
  expect(calls).toBe(3);
  expect(sleepCalls.length).toBe(2);
});
