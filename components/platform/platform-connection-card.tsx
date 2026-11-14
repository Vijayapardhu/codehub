"use client";

import { useState } from "react";
import {
  GitBranch,
  Code2,
  Trophy,
  ShieldCheck,
  Loader2,
  Check,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTrackerStore } from "@/lib/store/tracker-store";
import { useAuth } from "@/lib/firebase/auth";
import { connectPlatform, disconnectPlatform, syncPlatform, debouncedSyncPlatform, clearPlatformCache } from "@/lib/platform/api";
import { PLATFORM_META, type Platform } from "@/lib/platform/api";

const PLATFORM_ICONS: Record<Platform, React.ComponentType<{ className?: string }>> = {
  github: GitBranch,
  leetcode: Code2,
  codechef: Trophy,
  hackerrank: ShieldCheck,
};

export function PlatformConnectionCard({ platform }: { platform: Platform }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { user } = useAuth();
  const connection = useTrackerStore((s) => s.getPlatformConnection(platform));
  const stats = useTrackerStore((s) => s.getPlatformStats(platform));
  const meta = PLATFORM_META[platform];
  const Icon = PLATFORM_ICONS[platform];

  const handleConnect = async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      await connectPlatform(platform, username.trim(), user?.uid || undefined);
      // Debounced sync - waits 3 seconds to batch rapid calls
      debouncedSyncPlatform(platform, user?.uid || undefined, username.trim(), 3000)
        .catch((syncError) => {
          console.warn(`Sync failed for ${platform}:`, syncError);
        });
      toast.success(`Connected ${meta.label} as ${username}`);
      setOpen(false);
      setUsername("");
    } catch (error: any) {
      toast.error(error.message || `Failed to connect ${meta.label}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPlatform(platform);
      toast.success(`Disconnected ${meta.label}`);
    } catch (error: any) {
      toast.error(error.message || `Failed to disconnect ${meta.label}`);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPlatform(platform, user?.uid || undefined, connection?.username);
      toast.success(`${meta.label} data synced`);
    } catch (error: any) {
      toast.error(error.message || `Failed to sync ${meta.label}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bgColor}/15`}>
            <Icon className={`h-5 w-5 ${meta.color}`} />
          </div>
          <div>
            <h3 className="font-semibold">{meta.label}</h3>
            {connection ? (
              <p className="text-sm text-muted-foreground">@{connection.username}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>
        {connection && (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Connected
          </Badge>
        )}
      </div>

      {stats && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <div>
            <span className="font-semibold">{stats.totalSolved.toLocaleString()}</span>
            <span className="text-muted-foreground"> solved</span>
          </div>
          {stats.currentStreak > 0 && (
            <div>
              <span className="font-semibold text-orange-500">{stats.currentStreak}</span>
              <span className="text-muted-foreground"> day streak</span>
            </div>
          )}
          {stats.lastActiveDate && (
            <div>
              <span className="text-muted-foreground">Last active: </span>
              <span className="text-muted-foreground">
                {new Date(stats.lastActiveDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {connection ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleDisconnect}
            >
              <X className="h-4 w-4" />
              Disconnect
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                href={meta.url(connection.username)}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setOpen(true)}
          >
            Connect {meta.label}
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {meta.label}</DialogTitle>
            <DialogDescription>
              Enter your {meta.label} username to connect your account and track your progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                placeholder={`Your ${meta.label} username`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnect();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={loading || !username.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}