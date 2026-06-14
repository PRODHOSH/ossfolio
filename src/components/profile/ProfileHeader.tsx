"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Link2, Twitter, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContributorProfile } from "@/types";

interface ProfileHeaderProps {
  profile: ContributorProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <Image
        src={profile.avatarUrl}
        alt={profile.username}
        width={96}
        height={96}
        className="rounded-full ring-2 ring-border"
      />
      <div className="flex-1 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-foreground">{profile.name ?? profile.username}</h1>
        <p className="text-muted-foreground">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-sm text-foreground">{profile.bio}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
          {profile.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          {profile.websiteUrl && (
            <a
              href={profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link2 className="h-3 w-3" />
              {profile.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          )}
          {profile.twitterUsername && (
            <a
              href={`https://twitter.com/${profile.twitterUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Twitter className="h-3 w-3" />@{profile.twitterUsername}
            </a>
          )}
          <a
            href={profile.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Github className="h-3 w-3" />
            GitHub
          </a>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Badge variant="secondary">{profile.stats.totalPRs} PRs</Badge>
          <Badge variant="secondary">{profile.stats.totalIssues} Issues</Badge>
          <Badge variant="secondary">{profile.followers} followers</Badge>
          <Link href="/score-explained" title="How is this calculated?">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              Score: {profile.score}
            </Badge>
          </Link>
        </div>
      </div>
    </div>
  );
}
