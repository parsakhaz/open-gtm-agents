import { debugLog, durationMs, previewForLog } from "@/lib/debug-log";

type RetryInput = {
  provider: string;
  operation: string;
  attempts?: number;
  onRetry?: (attempt: number, maxAttempts: number, error: unknown) => void | Promise<void>;
};

export async function withProviderRetry<T>(
  input: RetryInput,
  work: (attempt: number) => Promise<T>,
): Promise<T> {
  const maxAttempts = input.attempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await work(attempt);
      debugLog("research-retry", "provider operation ok", {
        provider: input.provider,
        operation: input.operation,
        attempt,
        durationMs: durationMs(startedAt),
      });
      return result;
    } catch (error) {
      lastError = error;
      const finalAttempt = attempt === maxAttempts;
      debugLog(
        "research-retry",
        finalAttempt ? "provider operation failed" : "provider operation retry",
        {
          provider: input.provider,
          operation: input.operation,
          attempt,
          maxAttempts,
          durationMs: durationMs(startedAt),
          error: previewForLog(error instanceof Error ? error.message : error, 300),
        },
        finalAttempt ? "error" : "warn",
      );

      if (!finalAttempt) {
        await input.onRetry?.(attempt + 1, maxAttempts, error);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${input.provider} ${input.operation} failed.`);
}
