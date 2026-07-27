import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";

function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
  );
}

function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );
}

function warningMissingEnv() {
  if (typeof window !== "undefined" && !isSupabaseConfigured()) {
    console.warn(
      "[OSSfolio] Supabase is not configured. " +
        "Copy .env.example to .env.local and fill in your Supabase project details. " +
        "See CONTRIBUTING.md for setup instructions."
    );
  }
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    warningMissingEnv();
    _client = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _client;
}

export function resetSupabaseClientForTesting() {
  _client = null;
}

// Lazy proxy — avoids running createClient() at module-load time (which crashes
// Cloudflare's workerd on boot). The client is created on first property access.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export function supabaseAdmin(): SupabaseClient {
  warningMissingEnv();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient(getSupabaseUrl(), serviceKey);
}
