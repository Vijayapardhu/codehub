"use client";

import { useState, useEffect } from "react";
import { Bell, ShieldCheck, Code2, Trophy, Flame, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { PlatformConnectionCard } from "@/components/platform/platform-connection-card";
import { PlatformStatsOverview } from "@/components/platform/platform-stats-overview";
import { useAuth } from "@/lib/firebase/auth";
import { useTrackerStore } from "@/lib/store/tracker-store";
import { getDbInstance } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";

export default function SettingsPage() {
  const { user, profile, updateProfileData, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(9);
  const [streakReminder, setStreakReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlatformConnectionsFromFirestore();
    }
  }, [user]);

  const loadPlatformConnectionsFromFirestore = async () => {
    if (!user) return;
    try {
      const db = getDbInstance();
      if (!db) return;
      const docSnap = await getDoc(doc(db, "platformConnections", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as { connections?: Record<string, any> };
        const connections = data.connections || {};
        // Load each platform connection into the store
        const platforms: string[] = ["github", "leetcode", "codechef", "hackerrank"];
        for (const platform of platforms) {
          const conn = connections[platform];
          if (conn && conn.enabled) {
            useTrackerStore.getState().setPlatformConnection(platform as any, conn);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load platform connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleToggleNotification = async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    if (user) {
      await updateProfileData({ notificationsEnabled: newVal });
      if (newVal) {
        // Request notification permission
        if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            console.log("Notifications enabled");
          }
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, notifications, and platform connections.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile && (
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <span className="text-2xl font-bold">{profile.displayName?.charAt(0)}</span>
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium">{profile.displayName}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                {profile.college && (
                  <p className="text-sm text-muted-foreground">{profile.college}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-4">
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            Sign Out
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Control how you receive reminders and updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="font-medium">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive daily goal reminders and streak updates.
              </p>
            </div>
            {notificationsEnabled ? (
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={() => handleToggleNotification()}
                  className="rounded bg-primary border-primary focus:ring-0"
                />
              ) : (
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={() => handleToggleNotification()}
                  className="rounded bg-background border-border focus:ring-0"
                />
              )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="font-medium">Daily Reminder Time</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when it's time to work on your daily goal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
              type="range"
              min="6"
              max="22"
              value={dailyReminder}
              onChange={(e) => setDailyReminder(Number(e.target.value))}
              className="w-32 accent-primary"
            />
            <span className="text-xs font-medium">
              {dailyReminder}:00
            </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="font-medium">Streak Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when your streak is at risk.
              </p>
            </div>
            <input
              type="checkbox"
              checked={streakReminder}
              onChange={() => setStreakReminder(!streakReminder)}
              className="rounded bg-primary border-primary focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label className="font-medium">Weekly Progress Report</Label>
              <p className="text-xs text-muted-foreground">
                Receive a summary of your progress every Sunday.
              </p>
            </div>
            <input
              type="checkbox"
              checked={weeklyReport}
              onChange={() => setWeeklyReport(!weeklyReport)}
              className="rounded bg-primary border-primary focus:ring-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
          <CardDescription>
            Connect your coding platforms to auto-track progress and streaks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformStatsOverview />
          <Separator className="my-4" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PlatformConnectionCard platform="github" />
            <PlatformConnectionCard platform="leetcode" />
            <PlatformConnectionCard platform="codechef" />
            <PlatformConnectionCard platform="hackerrank" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">Dark mode</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}