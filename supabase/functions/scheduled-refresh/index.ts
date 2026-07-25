import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_API = "https://api.github.com";
const BATCH_SIZE = 50;
const LOCK_KEY = "scheduled_refresh";
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes — same as column default

serve(async (req) => {
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  if (!schedulerSecret) {
    return new Response(
      JSON.stringify({ error: "SCHEDULER_SECRET not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${schedulerSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Acquire lock ────────────────────────────────────────────────────
    // Prevent duplicate concurrent runs.  A stale lock (older than 10 min)
    // is replaced so a crashed invocation doesn't permanently block the cron.
    const now = new Date();
    const { data: lock } = await supabase
      .from("scheduler_locks")
      .upsert(
        {
          key: LOCK_KEY,
          locked_at: now,
          expires_at: new Date(now.getTime() + LOCK_TTL_MS),
        },
        { onConflict: "key", ignoreDuplicates: true },
      )
      .select("locked_at")
      .single();

    // If the row exists but was NOT updated by this upsert, another run is
    // already in progress (or a stale lock hasn't expired yet).
    if (!lock) {
      // Check if the existing lock is stale.
      const { data: existing } = await supabase
        .from("scheduler_locks")
        .select("locked_at, expires_at")
        .eq("key", LOCK_KEY)
        .single();

      if (existing && new Date(existing.expires_at) > now) {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: "concurrent run in progress",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // Stale lock — overwrite it.
      await supabase
        .from("scheduler_locks")
        .upsert(
          {
            key: LOCK_KEY,
            locked_at: now,
            expires_at: new Date(now.getTime() + LOCK_TTL_MS),
          },
          { onConflict: "key" },
        );
    }

    // ── Run refresh ─────────────────────────────────────────────────────
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("username")
      .order("view_count", { ascending: false })
      .limit(BATCH_SIZE);

    if (error || !profiles) {
      // Release lock on failure so the next run can proceed.
      await supabase.from("scheduler_locks").delete().eq("key", LOCK_KEY);
      return new Response(
        JSON.stringify({ error: error?.message || "No profiles found" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const results: { username: string; status: string }[] = [];

    for (const profile of profiles) {
      try {
        const ghRes = await fetch(
          `${GITHUB_API}/users/${encodeURIComponent(profile.username)}`,
          {
            headers: { Accept: "application/vnd.github.v3+json" },
          },
        );

        if (!ghRes.ok) {
          results.push({
            username: profile.username,
            status: `github_error_${ghRes.status}`,
          });
          continue;
        }

        const ghUser = await ghRes.json();

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: ghUser.name,
            avatar_url: ghUser.avatar_url,
            bio: ghUser.bio,
            followers: ghUser.followers,
            last_refreshed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("username", profile.username);

        if (updateError) {
          results.push({
            username: profile.username,
            status: "db_write_failed",
          });
        } else {
          results.push({ username: profile.username, status: "refreshed" });
        }
      } catch {
        results.push({ username: profile.username, status: "error" });
      }
    }

    // ── Release lock ────────────────────────────────────────────────────
    await supabase.from("scheduler_locks").delete().eq("key", LOCK_KEY);

    return new Response(
      JSON.stringify({
        refreshed: results.filter((r) => r.status === "refreshed").length,
        total: profiles.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    // Best-effort lock release so the cron doesn't stay stuck on error.
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("scheduler_locks").delete().eq("key", LOCK_KEY);
    } catch {
      // Nothing more we can do.
    }

    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
