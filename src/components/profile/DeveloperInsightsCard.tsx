"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeveloperInsights, DeveloperInsightsProfile } from "@/types";

interface DeveloperInsightsCardProps { profile: DeveloperInsightsProfile; }

function InsightList({ items }: { items: string[] }) {
  return <ul className="m-0 space-y-2 pl-5 text-sm leading-6 text-muted-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function DeveloperInsightsCard({ profile }: DeveloperInsightsCardProps) {
  const [insights, setInsights] = useState<DeveloperInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasProfileActivity = profile.publicRepos > 0 || profile.stats.totalContributions > 0 || profile.stats.totalCommits > 0 || profile.stats.totalPRs > 0 || profile.stats.totalIssues > 0;

  const generateInsights = async () => {
    if (!hasProfileActivity) { setError("There is not enough public profile activity to generate useful insights yet."); return; }
    setIsLoading(true); setError(null);
    try {
      const response = await fetch("/api/developer-insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.insights) {
        const retry = payload?.retryAfterSeconds;
        setError(retry ? `${payload?.error ?? "Unable to generate insights."} Try again in ${Math.ceil(retry / 60)} minute${Math.ceil(retry / 60) === 1 ? "" : "s"}.` : (payload?.error ?? "Unable to generate insights. Please try again."));
        return;
      }
      setInsights(payload.insights as DeveloperInsights);
    } catch { setError("A network error occurred. Please check your connection and try again."); }
    finally { setIsLoading(false); }
  };

  return (
    <section aria-labelledby="developer-insights-title" className="mt-8">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle id="developer-insights-title">Developer Insights</CardTitle><p className="mb-0 mt-2 text-sm leading-6 text-muted-foreground">AI-generated guidance from the public profile data shown above. Treat it as a starting point, not a hiring assessment.</p></div>
          <Button type="button" onClick={generateInsights} disabled={isLoading} aria-busy={isLoading}>{isLoading ? "Generating insights…" : insights ? "Regenerate insights" : "Generate Developer Insights"}</Button>
        </CardHeader>
        {error && <CardContent><p role="alert" className="m-0 text-sm text-destructive">{error}</p></CardContent>}
        {insights && <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2"><h3 className="mb-2 text-sm font-semibold">Overall assessment</h3><p className="m-0 text-sm leading-6 text-muted-foreground">{insights.overallAssessment}</p></div>
          <div><h3 className="mb-2 text-sm font-semibold">Strengths</h3><InsightList items={insights.strengths} /></div>
          <div><h3 className="mb-2 text-sm font-semibold">Areas for improvement</h3><InsightList items={insights.areasForImprovement} /></div>
          <div className="md:col-span-2"><h3 className="mb-2 text-sm font-semibold">Recruiter perspective</h3><p className="m-0 text-sm leading-6 text-muted-foreground">{insights.recruiterPerspective}</p></div>
          <div><h3 className="mb-2 text-sm font-semibold">Career recommendations</h3><InsightList items={insights.careerRecommendations} /></div>
          <div><h3 className="mb-2 text-sm font-semibold">Open-source suggestions</h3><InsightList items={insights.openSourceSuggestions} /></div>
          <div className="md:col-span-2"><h3 className="mb-2 text-sm font-semibold">Resume recommendations</h3><InsightList items={insights.resumeRecommendations} /></div>
        </CardContent>}
      </Card>
    </section>
  );
}
