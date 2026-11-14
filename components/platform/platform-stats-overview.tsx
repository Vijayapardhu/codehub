"use client";

import { Trophy, Target, Flame } from "lucide-react";
import { GitBranch, Code2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTrackerStore } from "@/lib/store/tracker-store";
import { PLATFORM_META, type Platform } from "@/lib/platform/api";

const PLATFORM_ICONS: Record<
  Platform,
  React.ComponentType<{ className?: string }>
> = {
  github: GitBranch,
  leetcode: Code2,
  codechef: Trophy,
  hackerrank: ShieldCheck,
};

export function PlatformStatsOverview() {
  const connections = useTrackerStore((s) => s.platformConnections);
  const stats = useTrackerStore((s) => s.platformStats);

  const connectedPlatforms = (Object.keys(connections) as Platform[]).filter(
    (p) => connections[p] !== null
  );

  if (connectedPlatforms.length === 0) {
    return null;
  }

  const totalSolved = connectedPlatforms.reduce(
    (sum, p) => sum + (stats[p]?.totalSolved || 0),
    0
  );

  const totalStreak = connectedPlatforms.reduce(
    (sum, p) => sum + (stats[p]?.currentStreak || 0),
    0
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">Platform Overview</h2>
        <Badge variant="secondary" className="gap-1">
          <Target className="h-3 w-3" />
          {connectedPlatforms.length} connected
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-2xl font-bold">{totalSolved.toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground">Total solved</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-2xl font-bold">{totalStreak}</span>
          </div>
          <p className="text-xs text-muted-foreground">Combined streak</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {connectedPlatforms.map((platform) => {
          const meta = PLATFORM_META[platform];
          const platformStats = stats[platform];
          const Icon = PLATFORM_ICONS[platform];

          return (
            <div key={platform} className="flex items-center gap-3">
              <Icon className={`h-4 w-4 ${meta.color}`} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-muted-foreground">
                    {platformStats?.totalSolved || 0} solved
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    ((platformStats?.totalSolved || 0) / 100) * 100
                  )}
                  className="h-1.5"
                />
              </div>
              {platformStats && platformStats.currentStreak > 0 && (
                <Badge variant="secondary" className="gap-1 text-orange-500">
                  <Flame className="h-3 w-3" />
                  {platformStats.currentStreak}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function StreakDisplay({ platform }: { platform: Platform }) {
  const stats = useTrackerStore((s) => s.getPlatformStats(platform));
  const meta = PLATFORM_META[platform];

  if (!stats || stats.currentStreak === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2">
      <Flame className="h-5 w-5 text-orange-500" />
      <div>
        <p className="text-sm font-semibold text-orange-500">
          {stats.currentStreak} day streak
        </p>
        <p className="text-xs text-muted-foreground">on {meta.label}</p>
      </div>
    </div>
  );
}