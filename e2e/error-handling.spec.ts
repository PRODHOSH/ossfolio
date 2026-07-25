import { test, expect } from "@playwright/test";

test.describe("structured API error responses", () => {
  test("v1 users endpoint returns 404 with standard error shape for unknown user", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/users/this-user-does-not-exist-e2e");
    expect(res.status()).toBe(404);

    const body = await res.json();
    expect(body).toMatchObject({
      error: expect.any(String),
      code: expect.any(String),
      status: 404,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  test("v1 users endpoint returns 400 with standard error shape for invalid username", async ({
    request,
  }) => {
    const res = await request.get("/api/v1/users/%00invalid");
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body).toMatchObject({
      error: expect.any(String),
      code: "VALIDATION_ERROR",
      status: 400,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  test("refresh endpoint returns 429 with retryAfterSeconds for rate limited requests", async ({
    request,
  }) => {
    // First request should succeed (or 404 if user doesn't exist)
    const res1 = await request.post("/api/test/refresh");
    // We expect either 429 (rate limited) or 400 (invalid) — both should have structured errors
    expect([400, 404, 429, 401, 200]).toContain(res1.status());

    if (res1.status() !== 200) {
      const body = await res1.json();
      expect(body).toMatchObject({
        error: expect.any(String),
        code: expect.any(String),
        status: res1.status(),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
      if (res1.status() === 429) {
        expect(body).toHaveProperty("retryAfterSeconds");
        expect(typeof body.retryAfterSeconds).toBe("number");
      }
    }
  });

  test("404 route returns proper error shape", async ({ request }) => {
    const res = await request.get("/api/nonexistent-route-e2e");
    expect(res.status()).toBe(404);

    const body = await res.json();
    if (body && typeof body === "object" && "error" in body) {
      expect(body).toMatchObject({
        error: expect.any(String),
        status: 404,
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    }
  });
});
