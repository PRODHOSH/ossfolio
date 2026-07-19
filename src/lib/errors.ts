export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: Record<string, unknown>,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized", details?: Record<string, unknown>) {
    super(message, 401, "AUTH_ERROR", details);
    this.name = "AuthError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: Record<string, unknown>) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    retryAfterSeconds: number,
    details?: Record<string, unknown>
  ) {
    super(message, 429, "RATE_LIMITED", details, retryAfterSeconds);
    this.name = "RateLimitError";
  }
}

export class UpstreamError extends AppError {
  constructor(message = "Upstream service unavailable", details?: Record<string, unknown>) {
    super(message, 502, "UPSTREAM_ERROR", details);
    this.name = "UpstreamError";
  }
}

/**
 * Thrown when the **GitHub API** (REST or GraphQL) returns a rate-limit response.
 *
 * Kept separate from `RateLimitError` (which models the app's own HTTP 429
 * responses to clients) to avoid conflating the two layers and to allow callers
 * to distinguish a GitHub quota exhaustion from any other kind of failure with a
 * simple `instanceof` check rather than fragile message-string comparisons.
 */
export class GitHubRateLimitError extends Error {
  readonly name = "GitHubRateLimitError";
  constructor(message = "GitHub API rate limit exceeded") {
    super(message);
  }
}

export interface ApiErrorBody {
  error: string;
  code: string;
  status: number;
  timestamp: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export function toApiErrorBody(error: AppError): ApiErrorBody {
  return {
    error: error.message,
    code: error.code,
    status: error.status,
    timestamp: new Date().toISOString(),
    ...(error.details ? { details: error.details } : {}),
    ...(error.retryAfterSeconds !== undefined
      ? { retryAfterSeconds: error.retryAfterSeconds }
      : {}),
  };
}
