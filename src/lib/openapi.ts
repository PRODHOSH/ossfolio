import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

/**
 * OpenAPI 3.1 description of the public read API.
 *
 * Scope is the endpoints an external integrator consumes. Authentication,
 * webhooks and the internal mutation routes are deliberately absent — they are
 * not part of a public integration surface, and publishing their shapes invites
 * probing rather than integration.
 *
 * Response schemas are declared here rather than inferred from the handlers.
 * Next route handlers return `NextResponse`, which carries no type information a
 * generator can read back, so a schema is the closest thing to a single source
 * of truth available without rewriting request handling across every route.
 * They are written against the exact object each handler builds, and the
 * envelope below matches `createApiResponse` in `lib/validators/api.ts`.
 *
 * Two endpoints return no JSON at all and are described by hand: the badge
 * endpoint emits SVG and the export endpoint emits a file. Both are documented
 * with their real media types rather than pretended into a schema.
 */

// Mirrors ApiSuccessResponse in lib/validators/api.ts.
const successEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data });

// Mirrors ApiErrorBody in lib/errors.ts.
export const ApiErrorSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
    code: z.string(),
    status: z.number(),
    timestamp: z.string(),
    retryAfterSeconds: z.number().optional(),
  })
  .openapi("ApiError");

export const UserProfileSchema = z
  .object({
    username: z.string(),
    name: z.string().nullable(),
    avatar_url: z.string().nullable(),
    github_url: z.string().nullable(),
    bio: z.string().nullable(),
    headline: z.string().nullable(),
    score: z.number(),
    followers: z.number(),
    top_languages: z.array(z.string()),
    stats: z.object({
      commits: z.number(),
      prs: z.number(),
      issues: z.number(),
      reviews: z.number(),
    }),
    badges: z.unknown(),
    last_refreshed_at: z.string().nullable(),
  })
  .openapi("UserProfile");

export const DiscoverPageSchema = z
  .object({
    profiles: z.array(z.unknown()),
    page: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  })
  .openapi("DiscoverPage");

export const SponsorshipSchema = z
  .object({
    username: z.string(),
    fundingLinks: z.array(z.object({ platform: z.string(), url: z.string() })),
    sponsors: z.array(z.unknown()),
  })
  .openapi("Sponsorship");

export const AnalyticsSchema = z
  .object({
    username: z.string(),
    days: z.number(),
    totalViews: z.number(),
    uniqueVisitors: z.number(),
    viewsTrend: z.array(z.unknown()),
    referrers: z.array(z.unknown()),
    topCountries: z.array(z.unknown()),
    deviceBreakdown: z.array(z.unknown()),
  })
  .openapi("Analytics");

const usernameParam = z.object({
  username: z.string().openapi({ example: "e2e-alice" }),
});

const jsonError = (description: string) => ({
  description,
  content: { "application/json": { schema: ApiErrorSchema } },
});

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerPath({
    method: "get",
    path: "/api/v1/users/{username}",
    tags: ["Profiles"],
    summary: "Fetch a contributor profile",
    description:
      "Returns a contributor's score, statistics and badge metadata. Supports " +
      "conditional requests: send the ETag from a previous response as " +
      "If-None-Match and a 304 is returned with no body when nothing has changed.",
    request: { params: usernameParam },
    responses: {
      200: {
        description: "The contributor profile.",
        content: {
          "application/json": { schema: successEnvelope(UserProfileSchema) },
        },
        headers: z.object({
          ETag: z
            .string()
            .openapi({ description: "Validator for conditional requests." }),
          "Cache-Control": z.string(),
        }),
      },
      304: {
        description:
          "The If-None-Match validator matched. No body is returned; reuse the " +
          "cached representation.",
      },
      400: jsonError("The username failed validation."),
      404: jsonError("No profile exists for that username."),
      429: {
        ...jsonError("Rate limit exceeded."),
        headers: z.object({
          "Retry-After": z.string().openapi({
            description: "Seconds to wait before retrying.",
          }),
        }),
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/analytics/{username}",
    tags: ["Profiles"],
    summary: "Fetch profile analytics",
    request: { params: usernameParam },
    responses: {
      200: {
        description: "View counts and traffic breakdown.",
        content: {
          "application/json": { schema: successEnvelope(AnalyticsSchema) },
        },
      },
      400: jsonError("The username failed validation."),
      401: jsonError("Analytics are only readable by the profile owner."),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/sponsors/{username}",
    tags: ["Profiles"],
    summary: "Fetch sponsorship links",
    request: { params: usernameParam },
    responses: {
      200: {
        description: "Funding links and sponsors.",
        content: {
          "application/json": { schema: successEnvelope(SponsorshipSchema) },
        },
      },
      400: jsonError("The username failed validation."),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/discover",
    tags: ["Discovery"],
    summary: "Browse contributor profiles",
    request: {
      query: z.object({
        page: z.string().optional().openapi({ example: "1" }),
      }),
    },
    responses: {
      200: {
        description: "A page of profiles.",
        content: {
          "application/json": { schema: successEnvelope(DiscoverPageSchema) },
        },
      },
      500: jsonError("The profile query failed."),
    },
  });

  // Described by hand: this endpoint emits SVG, so there is no JSON schema to
  // derive. Documenting it with its real media type is more useful to an
  // integrator than omitting it.
  registry.registerPath({
    method: "get",
    path: "/api/badge/{username}",
    tags: ["Badges"],
    summary: "Render a contributor score badge",
    description:
      "Returns an SVG badge suitable for embedding in a README. This endpoint " +
      "does not return JSON.",
    request: { params: usernameParam },
    responses: {
      200: {
        description: "The badge.",
        content: { "image/svg+xml": { schema: z.string() } },
      },
      400: {
        description: "The username parameter was missing.",
        content: { "text/plain": { schema: z.string() } },
      },
      500: {
        description: "Badge generation failed.",
        content: { "text/plain": { schema: z.string() } },
      },
    },
  });

  // Also hand-described: a file download rather than a JSON body.
  registry.registerPath({
    method: "get",
    path: "/api/export/{username}",
    tags: ["Profiles"],
    summary: "Export a profile",
    description:
      "Returns the profile as a downloadable document rather than a JSON API " +
      "response.",
    request: { params: usernameParam },
    responses: {
      200: {
        description: "The exported profile.",
        content: { "application/octet-stream": { schema: z.string() } },
      },
      400: {
        description: "The username parameter was missing.",
        content: { "text/plain": { schema: z.string() } },
      },
      500: {
        description: "Export failed.",
        content: { "text/plain": { schema: z.string() } },
      },
    },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "OSSfolio Public API",
      version: "1.0.0",
      description:
        "Read-only endpoints for consuming OSSfolio contributor scores and " +
        "badge metadata.\n\n" +
        "**Rate limiting.** Requests are limited per client. A 429 carries a " +
        "`Retry-After` header giving the seconds to wait, and the body's " +
        "`retryAfterSeconds` field repeats it.\n\n" +
        "**Conditional requests.** Endpoints that return an `ETag` accept " +
        "`If-None-Match`. Sending back the validator you already hold returns " +
        "304 with no body, which saves bandwidth and does not count against " +
        "your rate limit budget any differently from a 200.\n\n" +
        "Authentication, webhook and internal mutation endpoints are " +
        "intentionally not documented here.",
    },
    servers: [{ url: "https://ossfolio.dev" }],
    tags: [
      { name: "Profiles", description: "Contributor profile data." },
      { name: "Discovery", description: "Browsing and search." },
      { name: "Badges", description: "Embeddable SVG badges." },
    ],
  });
}
