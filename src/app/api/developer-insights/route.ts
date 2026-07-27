import { NextRequest } from "next/server";
import { DEVELOPER_INSIGHTS_SYSTEM_PROMPT, developerInsightsPrompt, parseDeveloperInsights, parseDeveloperInsightsProfile } from "@/lib/developer-insights";
import { checkDeveloperInsightsRateLimit } from "@/lib/rate-limit";
import { createApiResponse, createErrorResponse } from "@/lib/validators/api";

export const runtime = "edge";

interface AnthropicResponse { content?: Array<{ type?: string; text?: string }>; }
interface OpenAIResponse { choices?: Array<{ message?: { content?: string | null } }>; }

async function generateWithAnthropic(prompt: string, apiKey: string): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: process.env.AI_MODEL ?? "claude-3-5-haiku-latest", max_tokens: 1400, temperature: 0.3, system: DEVELOPER_INSIGHTS_SYSTEM_PROMPT, messages: [{ role: "user", content: prompt }] }) });
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.AI_MODEL ?? "gpt-4o-mini", temperature: 0.3, response_format: { type: "json_object" }, messages: [{ role: "system", content: DEVELOPER_INSIGHTS_SYSTEM_PROMPT }, { role: "user", content: prompt }] }) });
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkDeveloperInsightsRateLimit(request);
  if (!rateLimit.allowed) return createErrorResponse("Too many insight requests. Please try again shortly.", 429, { retryAfterSeconds: rateLimit.retryAfterSeconds }, { "Retry-After": String(rateLimit.retryAfterSeconds) });

  const provider = process.env.AI_PROVIDER ?? "anthropic";
  const apiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  if (!apiKey || (provider !== "anthropic" && provider !== "openai")) return createErrorResponse("Developer Insights is not configured.", 503);

  let body: unknown;
  try { body = await request.json(); } catch { return createErrorResponse("Invalid JSON request body.", 400); }
  const profile = parseDeveloperInsightsProfile((body as { profile?: unknown } | null)?.profile);
  if (!profile) return createErrorResponse("Invalid profile data.", 400);

  try {
    const response = provider === "anthropic"
      ? await generateWithAnthropic(developerInsightsPrompt(profile), apiKey)
      : await generateWithOpenAI(developerInsightsPrompt(profile), apiKey);
    if (response.status === 429) return createErrorResponse("The AI provider is rate limited. Please try again shortly.", 429, undefined, { "Retry-After": response.headers.get("retry-after") ?? "60" });
    if (!response.ok) return createErrorResponse("Developer Insights is temporarily unavailable.", 502);
    const result = (await response.json()) as AnthropicResponse & OpenAIResponse;
    const content = provider === "anthropic"
      ? result.content?.find((item) => item.type === "text")?.text
      : result.choices?.[0]?.message?.content ?? undefined;
    if (!content) return createErrorResponse("The AI provider returned an invalid response.", 502);
    let insights: ReturnType<typeof parseDeveloperInsights>;
    try { insights = parseDeveloperInsights(JSON.parse(content)); } catch { insights = null; }
    if (!insights) return createErrorResponse("The AI provider returned an invalid response.", 502);
    return createApiResponse({ insights });
  } catch (error) {
    console.error("[developer-insights] request failed:", error);
    return createErrorResponse("Developer Insights is temporarily unavailable.", 502);
  }
}
