'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TechEntry } from '@/types';
import type { SkillEndorsementSummary } from '@/lib/endorsements';
import { supabase } from '@/lib/supabase';

interface SkillEndorsementsProps {
  username: string;
  profileUserId: string | null;
  techStack?: TechEntry[];
}

const DEFAULT_CUSTOM_SKILLS = [
  'Code Review',
  'Technical Writing',
  'Architecture',
  'React',
  'TypeScript',
  'Go',
  'Rust',
  'Python',
  'Docker',
  'DevOps',
];

export function SkillEndorsements({
  username,
  profileUserId,
  techStack = [],
}: SkillEndorsementsProps) {
  const [endorsements, setEndorsements] = useState<
    Record<string, SkillEndorsementSummary>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSkillAction, setActiveSkillAction] = useState<string | null>(
    null,
  );
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setCurrentUserId(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load endorsements for profile
  const loadEndorsements = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `/api/profile/endorse?username=${encodeURIComponent(username)}`,
        { headers },
      );
      if (res.ok) {
        const json = await res.json();
        setEndorsements(json.endorsements || {});
      }
    } catch (err) {
      console.error('Failed to load endorsements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadEndorsements();
  }, [loadEndorsements]);

  const isSelfProfile =
    currentUserId && profileUserId && currentUserId === profileUserId;

  const handleEndorseToggle = async (skill: string) => {
    if (isSelfProfile) {
      setErrorMsg('You cannot endorse skills on your own profile.');
      return;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setErrorMsg('Please sign in to endorse skills.');
      return;
    }

    setErrorMsg(null);
    setActiveSkillAction(skill);

    try {
      const res = await fetch('/api/profile/endorse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username,
          skill,
          profileUserId,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.endorsements) {
          setEndorsements(json.endorsements);
        } else {
          await loadEndorsements();
        }
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json.error || 'Failed to update endorsement');
      }
    } catch (err) {
      console.error('Error toggling endorsement:', err);
      setErrorMsg('Failed to update endorsement');
    } finally {
      setActiveSkillAction(null);
    }
  };

  const handleAddCustomSkill = async () => {
    if (!customSkillInput.trim()) return;
    const newSkill = customSkillInput.trim();
    setCustomSkillInput('');
    setShowCustomModal(false);
    await handleEndorseToggle(newSkill);
  };

  // Combine techStack languages and endorsed custom skills
  const allSkillsSet = new Set<string>();
  techStack.forEach((t) => allSkillsSet.add(t.language));
  Object.keys(endorsements).forEach((s) => allSkillsSet.add(s));

  const allSkills = Array.from(allSkillsSet);

  return (
    <div style={{ marginTop: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: 0,
            letterSpacing: '-0.1px',
          }}
        >
          Skill Endorsements
        </h3>

        {currentUserId && !isSelfProfile && (
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-hairline)',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            + Endorse Custom Skill
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          style={{
            fontSize: '12px',
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '6px 10px',
            marginBottom: '12px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Skills list */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {allSkills.map((skill) => {
          const endorsement = endorsements[skill] || {
            skill,
            count: 0,
            userHasEndorsed: false,
          };
          const isPending = activeSkillAction === skill;

          return (
            <div
              key={skill}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                border: `1px solid ${
                  endorsement.userHasEndorsed
                    ? 'var(--color-primary)'
                    : 'var(--color-hairline)'
                }`,
                backgroundColor: endorsement.userHasEndorsed
                  ? 'rgba(62, 207, 142, 0.12)'
                  : 'var(--color-canvas-soft)',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                }}
              >
                {skill}
              </span>

              {endorsement.count > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: endorsement.userHasEndorsed
                      ? 'var(--color-primary)'
                      : 'var(--color-ink-mute)',
                    backgroundColor: 'var(--color-canvas)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  👍 {endorsement.count}
                </span>
              )}

              {/* Endorse action button for authenticated users on other profiles */}
              {currentUserId && !isSelfProfile && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleEndorseToggle(skill)}
                  title={
                    endorsement.userHasEndorsed
                      ? 'Click to remove your endorsement'
                      : `Endorse ${username} for ${skill}`
                  }
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: endorsement.userHasEndorsed
                      ? 'var(--color-primary)'
                      : 'var(--color-ink-mute)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: isPending ? 'wait' : 'pointer',
                    borderRadius: '4px',
                  }}
                >
                  {isPending
                    ? '...'
                    : endorsement.userHasEndorsed
                      ? 'Endorsed ✓'
                      : '+ Endorse'}
                </button>
              )}
            </div>
          );
        })}

        {allSkills.length === 0 && !isLoading && (
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-mute)',
              fontStyle: 'italic',
            }}
          >
            No skills listed or endorsed yet.
          </span>
        )}
      </div>

      {/* Modal for adding custom skill endorsement */}
      {showCustomModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowCustomModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-hairline)',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                margin: '0 0 12px 0',
              }}
            >
              Endorse {username} for a Skill
            </h4>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '16px',
              }}
            >
              {DEFAULT_CUSTOM_SKILLS.map((skillSuggestion) => (
                <button
                  key={skillSuggestion}
                  type="button"
                  onClick={() => {
                    setCustomSkillInput(skillSuggestion);
                  }}
                  style={{
                    fontSize: '12px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-hairline)',
                    backgroundColor: 'var(--color-canvas-soft)',
                    color: 'var(--color-ink-mute)',
                    cursor: 'pointer',
                  }}
                >
                  {skillSuggestion}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Enter skill name (e.g. Code Review)..."
              value={customSkillInput}
              onChange={(e) => setCustomSkillInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid var(--color-hairline-strong)',
                backgroundColor: 'var(--color-canvas-soft)',
                color: 'var(--color-ink)',
                marginBottom: '16px',
                outline: 'none',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: 'var(--color-ink-mute)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomSkill}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: 'var(--color-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Endorse Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
