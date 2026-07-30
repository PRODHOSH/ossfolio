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
    retryAfterSeconds?: number,
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
  constructor(
    message = "Validation failed",
    details?: Record<string, unknown>,
  ) {
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
  constructor(
    message = "Resource not found",
    details?: Record<string, unknown>,
  ) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    retryAfterSeconds: number,
    details?: Record<string, unknown>,
  ) {
    super(message, 429, "RATE_LIMITED", details, retryAfterSeconds);
    this.name = "RateLimitError";
  }
}

export class UpstreamError extends AppError {
  constructor(
    message = "Upstream service unavailable",
    details?: Record<string, unknown>,
  ) {
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

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

// A type alias rather than an interface, deliberately.
//
// ApiErrorResponse in validators/api.ts carries an `[key: string]: unknown`
// index signature. TypeScript gives type aliases an implicit index signature
// but not interfaces, so declaring this as an interface made it unassignable to
// ApiErrorResponse — which is what errorResponse() returns. The members are
// identical either way; only the assignability rule differs.
export type ApiErrorBody = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  code: ErrorCode;
  status: number;
  timestamp: string;
  retryAfterSeconds?: number;
};

export function toApiErrorBody(error: AppError): ApiErrorBody {
  const code = (error.code || "INTERNAL_ERROR") as ErrorCode;
  return {
    success: false,
    error: {
      code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
    code,
    status: error.status,
    timestamp: new Date().toISOString(),
    ...(error.retryAfterSeconds !== undefined
      ? { retryAfterSeconds: error.retryAfterSeconds }
      : {}),
  };
}
