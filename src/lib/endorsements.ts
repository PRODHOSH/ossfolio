import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export interface SkillEndorsementSummary {
  skill: string;
  count: number;
  userHasEndorsed: boolean;
}

export interface EndorseToggleResult {
  success: boolean;
  action?: "added" | "removed";
  error?: string;
  count?: number;
}

/**
 * Normalizes skill string (trims whitespace, preserves case display)
 */
export function normalizeSkill(skill: string): string {
  return skill.trim();
}

/**
 * Fetch all skill endorsement counts and current user's endorsement status for a profile.
 */
export async function fetchProfileEndorsements(
  username: string,
  currentUserId?: string | null,
): Promise<Record<string, SkillEndorsementSummary>> {
  if (!username) return {};

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return {};
  }

  try {
    const normalizedUsername = username.toLowerCase();
    const { data, error } = await supabase
      .from("endorsements")
      .select("skill, endorser_user_id")
      .eq("endorsed_username", normalizedUsername);

    if (error || !data) {
      return {};
    }

    const summaryMap: Record<string, SkillEndorsementSummary> = {};

    data.forEach((row) => {
      const skillName = row.skill;
      if (!summaryMap[skillName]) {
        summaryMap[skillName] = {
          skill: skillName,
          count: 0,
          userHasEndorsed: false,
        };
      }
      summaryMap[skillName].count += 1;
      if (currentUserId && row.endorser_user_id === currentUserId) {
        summaryMap[skillName].userHasEndorsed = true;
      }
    });

    return summaryMap;
  } catch (err) {
    console.error("Error fetching profile endorsements:", err);
    return {};
  }
}

/**
 * Server-side / authed helper to toggle skill endorsement (add or remove).
 */
export async function toggleEndorsement(
  endorserUserId: string,
  endorsedUsername: string,
  endorsedProfileUserId: string | null,
  skill: string,
  userAccessToken?: string,
): Promise<EndorseToggleResult> {
  const normalizedSkill = normalizeSkill(skill);
  const normalizedUsername = endorsedUsername.toLowerCase();

  if (!endorserUserId || !normalizedUsername || !normalizedSkill) {
    return { success: false, error: "Invalid parameters" };
  }

  // Prevent self-endorsement
  if (endorsedProfileUserId && endorserUserId === endorsedProfileUserId) {
    return { success: false, error: "You cannot endorse your own skills" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return { success: false, error: "Database misconfigured" };
  }

  // Use service role if available, or client with user token
  const dbClient = serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : userAccessToken
    ? createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
        global: { headers: { Authorization: `Bearer ${userAccessToken}` } },
      })
    : supabase;

  try {
    // Check if endorsement already exists
    const { data: existing, error: findError } = await dbClient
      .from("endorsements")
      .select("id")
      .eq("endorser_user_id", endorserUserId)
      .eq("endorsed_username", normalizedUsername)
      .eq("skill", normalizedSkill)
      .maybeSingle();

    if (findError) {
      console.error("Error checking endorsement:", findError.message);
    }

    if (existing) {
      // Remove existing endorsement (toggle off)
      const { error: deleteError } = await dbClient
        .from("endorsements")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      return { success: true, action: "removed" };
    } else {
      // Insert new endorsement (toggle on)
      const { error: insertError } = await dbClient.from("endorsements").insert({
        endorser_user_id: endorserUserId,
        endorsed_username: normalizedUsername,
        skill: normalizedSkill,
      });

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, action: "added" };
    }
  } catch (err) {
    console.error("Failed to toggle endorsement:", err);
    return { success: false, error: "Server error" };
  }
}
