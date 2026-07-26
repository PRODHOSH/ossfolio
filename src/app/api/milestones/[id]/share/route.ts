import { DEFINITIONS } from "@/lib/achievements";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || "";

  if (!id) {
    return new Response(
      JSON.stringify({ error: "Milestone ID parameter is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const definition = DEFINITIONS.find((d) => d.id === id);

  if (!definition) {
    return new Response(
      JSON.stringify({ error: "Milestone not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let unlockedAt: string | null = null;
  if (username) {
    try {
      const { data } = await supabase
        .from("achievement_unlocks")
        .select("unlocked_at")
        .eq("username", username.toLowerCase())
        .eq("achievement_id", id)
        .maybeSingle();

      if (data) {
        unlockedAt = data.unlocked_at;
      }
    } catch {
      // Ignore database read error
    }
  }

  const title = username
    ? `${username}'s ${definition.name} Milestone on OSSfolio`
    : `${definition.name} Milestone on OSSfolio`;
  const description = `${definition.name}: ${definition.tagline}. Track open source achievements and streaks on OSSfolio.`;
  const shareText = `🏆 I unlocked the "${definition.name}" milestone (${definition.tagline}) on OSSfolio!`;

  return new Response(
    JSON.stringify({
      id: definition.id,
      name: definition.name,
      tagline: definition.tagline,
      target: definition.target,
      category: definition.category,
      icon: definition.icon,
      username,
      unlockedAt,
      shareText,
      meta: {
        title,
        description,
        icon: definition.icon,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    }
  );
}
