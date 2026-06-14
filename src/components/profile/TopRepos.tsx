"use client";

import { Star, GitFork, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Repo } from "@/types";

interface TopReposProps {
  repos: Repo[];
}

export function TopRepos({ repos }: TopReposProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Top Repositories</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {repos.slice(0, 6).map((repo) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${repo.name} repository on GitHub (opens in a new tab)`}
            className="group rounded-lg border border-border p-3 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {repo.name}
              </p>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            </div>
            {repo.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3">
              {repo.language && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: repo.languageColor ?? "#888" }}
                  />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3" />
                {repo.stars.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitFork className="h-3 w-3" />
                {repo.forks.toLocaleString()}
              </span>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
