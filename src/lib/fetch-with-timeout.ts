export class FetchTimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "FetchTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

function isAbortLikeError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // 1. Signal Chaining: Combine the external signal (if any) with our internal timeout signal
  const combinedSignal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(input, {
      ...init,
      signal: combinedSignal,
    });
    return res;
  } catch (err) {
    if (isAbortLikeError(err)) {
      // Only throw our custom timeout error if our specific controller caused the abort
      if (controller.signal.aborted) {
        throw new FetchTimeoutError(
          `Request timed out after ${timeoutMs}ms`,
          timeoutMs,
        );
      }
      // If the external signal caused the abort, just let the original error propagate
    }
    throw err;
  } finally {
    // 2. Timeout Cleanup: Reliably clear the interval to prevent memory leaks
    clearTimeout(timeoutId);
  }
}
