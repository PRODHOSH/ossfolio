export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder') &&
    !url.includes('your-project-url') &&
    !key.includes('your-anon-key'),
  );
}
