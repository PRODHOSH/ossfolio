import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

function warningMissingEnv() {
  if (typeof window !== "undefined" && !isSupabaseConfigured()) {
    console.warn(
      "[OSSfolio] Supabase is not configured. " +
      "Copy .env.example to .env.local and fill in your Supabase project details. " +
      "See CONTRIBUTING.md for setup instructions."
    );
  }
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    warningMissingEnv();
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

export const supabase = getSupabase();

export function supabaseAdmin(): SupabaseClient {
  warningMissingEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(supabaseUrl, serviceKey);
}

// NOTE: Ensure database migrations (compound index idx_profiles_score_username) are applied in Supabase
// to keep paginated getSupabase queries performant under heavy user loads.
