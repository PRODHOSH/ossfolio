export class RateLimitError extends Error {
  constructor(message: string = "GitHub API rate limit reached.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class GitHubApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function getGitHubErrorMessage(body: unknown): string | null {
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!body || typeof body !== "object") return null;

  const message = (body as { message?: unknown }).message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  return null;
}

export function isGitHubRateLimitedResponse(
  response: Response,
  body: unknown
): boolean {
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return true;
  }

  const message = getGitHubErrorMessage(body);
  return typeof message === "string" && message.toLowerCase().includes("rate limit");
}

export async function createGitHubApiError(
  response: Response
): Promise<RateLimitError | GitHubApiError> {
  let body: unknown = null;
  const text = await response.text();

  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (isGitHubRateLimitedResponse(response, body)) {
    return new RateLimitError();
  }

  const message = getGitHubErrorMessage(body) ?? `GitHub API request failed (${response.status})`;
  return new GitHubApiError(message, response.status);
}