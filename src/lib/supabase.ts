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

// Connection pool sizing — the Supabase JS client uses HTTP keep-alive under
// the hood, so these options control connection-level behaviour at the
// transport layer. The pool settings here are tuned for a serverless edge
// environment where short-lived, bursty connections are the norm.
const POOL_CONFIG = {
  db: {
    pool: {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 10_000,
      createTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    },
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    warningMissingEnv();
    client = createClient(supabaseUrl, supabaseAnonKey, POOL_CONFIG);
  }
  return client;
}

export const supabase = getSupabase();

export function supabaseAdmin(): SupabaseClient {
  warningMissingEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(supabaseUrl, serviceKey, POOL_CONFIG);
}
