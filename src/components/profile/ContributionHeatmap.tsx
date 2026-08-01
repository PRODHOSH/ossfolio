'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { HeatmapWeek } from '@/types';

interface ContributionHeatmapProps {
  weeks: HeatmapWeek[];
  totalContributions: number;
}

export function ContributionHeatmap({
  weeks,
  totalContributions,
}: ContributionHeatmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {totalContributions.toLocaleString()} contributions in the last year
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-0.5 overflow-x-auto pb-2">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.days.map((day, di) => (
                <div
                  key={di}
                  title={`${day.count} contributions on ${day.date}`}
                  className="h-3 w-3 rounded-xs"
                  style={{ backgroundColor: day.color }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
