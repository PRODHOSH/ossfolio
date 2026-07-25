import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_API = "https://api.github.com";
const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const RATE_LIMIT_MS = 10 * 60 * 1000;

serve(async (req) => {
  try {
    const { username } = await req.json();
    if (
      !username ||
      !GITHUB_USERNAME_REGEX.test(username) ||
      username.length > 39
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("username, last_refreshed_at")
      .eq("username", username)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cutoff = new Date(Date.now() - RATE_LIMIT_MS).toISOString();

    const { data: claimed, error: claimError } = await supabase
      .from("profiles")
      .update({ last_refreshed_at: new Date().toISOString() })
      .eq("username", username)
      .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${cutoff}`)
      .select("username")
      .single();

    if (claimError || !claimed) {
      return new Response(
        JSON.stringify({ error: "Rate limited", retryAfterSeconds: 600 }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const ghRes = await fetch(
      `${GITHUB_API}/users/${encodeURIComponent(username)}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      },
    );

    if (!ghRes.ok) {
      return new Response(
        JSON.stringify({ error: `GitHub API returned ${ghRes.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const ghUser = await ghRes.json();

    const { error } = await supabase
      .from("profiles")
      .update({
        name: ghUser.name,
        avatar_url: ghUser.avatar_url,
        bio: ghUser.bio,
        followers: ghUser.followers,
        updated_at: new Date().toISOString(),
      })
      .eq("username", username);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        username,
        refreshedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
