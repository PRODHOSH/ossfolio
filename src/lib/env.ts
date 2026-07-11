const REQUIRED_PUBLIC_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const REQUIRED_SERVER_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

interface EnvResult {
  missing: string[];
  valid: boolean;
}

function checkVars(vars: readonly string[]): EnvResult {
  const missing: string[] = [];
  for (const key of vars) {
    if (!process.env[key] || process.env[key] === "placeholder-anon-key" || process.env[key] === "https://placeholder.supabase.co") {
      missing.push(key);
    }
  }
  return { missing, valid: missing.length === 0 };
}

export function validatePublicEnv(): EnvResult {
  return checkVars(REQUIRED_PUBLIC_VARS);
}

export function validateServerEnv(): EnvResult {
  return checkVars(REQUIRED_SERVER_VARS);
}

export function getEnvWarning(): string | null {
  const publicEnv = validatePublicEnv();
  if (!publicEnv.valid) {
    return `Missing required public environment variables: ${publicEnv.missing.join(", ")}. Copy .env.example to .env.local and fill in the values.`;
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(
    url &&
    key &&
    !url.includes("placeholder") &&
    !key.includes("placeholder")
  );
}

export const isDev = process.env.NODE_ENV === "development";
