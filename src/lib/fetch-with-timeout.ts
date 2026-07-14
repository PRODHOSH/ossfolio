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
  timeoutMs: number = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (isAbortLikeError(err)) {
      throw new FetchTimeoutError(
        `Request timed out after ${timeoutMs}ms`,
        timeoutMs
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

