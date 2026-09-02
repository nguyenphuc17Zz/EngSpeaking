// Retry with exponential backoff §35-36
export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number, isRetryable: (e: unknown) => boolean): Promise<{ result: T; retryCount: number } | { error: unknown; retryCount: number }> {
  let retryCount = 0;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retryCount };
    } catch (e: unknown) {
      lastError = e;
      if (attempt === maxRetries || !isRetryable(e)) return { error: e, retryCount };
      const backoff = Math.min(2000, 200 * 2 ** attempt + Math.random() * 100);
      await new Promise((r) => setTimeout(r, backoff));
      retryCount++;
    }
  }
  return { error: lastError, retryCount };
}

export function isRetryableError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  const code = (e as { code?: string })?.code || "";
  if (["NETWORK_ERROR", "TIMEOUT", "QUOTA_ERROR"].includes(code)) return code !== "QUOTA_ERROR"; // quota not retryable without backoff known
  if (msg.includes("network") || msg.includes("timeout") || msg.includes("temporarily") || msg.includes("rate limit")) return true;
  if (msg.includes("invalid") || msg.includes("auth") || msg.includes("unsupported")) return false;
  return false;
}
