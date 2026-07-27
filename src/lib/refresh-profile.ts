import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// A refresh bumps `last_refreshed_at` (which the profile page reads to re-fetch
// from GitHub on its next render) and revalidates that page's cache. It's
// rate-limited so rapid triggers — e.g. a burst of webhook pushes — don't hammer
// the profile. This mirrors the manual Refresh endpoint's original behaviour,
// extracted here so both the route and the webhook share one implementation.

const RATE_LIMIT_MS = 10 * 60 * 1000;

export type RefreshResult =
  | { status: "refreshed"; username: string }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "not_found" }
  | { status: "error" };

export async function refreshProfile(username: string): Promise<RefreshResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return { status: "error" };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Attempt PostgreSQL transactional advisory lock to prevent concurrent refresh races
  try {
    const { data: lockAcquired, error: rpcError } = await supabase.rpc(
      "try_acquire_profile_refresh_lock",
      { p_username: username },
    );
    if (!rpcError && lockAcquired === false) {
      return {
        status: "rate_limited",
        retryAfterSeconds: Math.ceil(RATE_LIMIT_MS / 1000),
      };
    }
  } catch (err) {
    console.warn("[refresh-profile] RPC try_acquire_profile_refresh_lock error:", err);
  }

  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - RATE_LIMIT_MS).toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update({ last_refreshed_at: now, updated_at: now })
    .eq("username", username)
    .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${cutoff}`)
    .select("username")
    .single();

  // PGRST116 = no row matched the update (either the profile doesn't exist, or
  // it exists but is still within the rate-limit window).
  if (error && error.code === "PGRST116") {
    const { data: exists, error: existsError } = await supabase
      .from("profiles")
      .select("username, last_refreshed_at")
      .eq("username", username)
      .single();

    // A PGRST116 here means the row genuinely doesn't exist; any other error is
    // an operational failure and must not be reported as "not found".
    if (existsError && existsError.code !== "PGRST116") {
      return { status: "error" };
    }
    if (!exists) {
      return { status: "not_found" };
    }

    const lastRefresh = exists.last_refreshed_at
      ? new Date(exists.last_refreshed_at).getTime()
      : 0;
    const retryAfter = Math.ceil(
      (RATE_LIMIT_MS - (Date.now() - lastRefresh)) / 1000,
    );
    return {
      status: "rate_limited",
      retryAfterSeconds: Math.max(retryAfter, 1),
    };
  }

  if (error) {
    return { status: "error" };
  }

  revalidatePath(`/${data.username}`);
  return { status: "refreshed", username: data.username };
}
