"use client";

import { ImpactNetwork } from "./ImpactNetwork";
import type { MergedPR, Org, CoContributor } from "@/types";

export interface ImpactNetworkGraphProps {
  user: {
    login: string;
    name?: string | null;
    avatar_url?: string;
    html_url?: string;
    public_repos?: number;
    followers?: number;
    bio?: string | null;
  };
  repos?: Array<{
    name: string;
    stargazers_count?: number;
    forks_count?: number;
    language?: string | null;
    html_url?: string;
    description?: string | null;
  }>;
  orgs?: Org[];
  mergedPRs?: MergedPR[];
  coContributors?: CoContributor[];
}

/**
 * Interactive Impact Network Graph component.
 * Renders an interactive D3 force-directed network graph visualizing the user's
 * connections to repositories, organizations, and co-contributors.
 */
export function ImpactNetworkGraph(props: ImpactNetworkGraphProps) {
  return <ImpactNetwork {...props} />;
}

export default ImpactNetworkGraph;
