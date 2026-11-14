"use client";

import { useState, useEffect } from "react";
import { Target, CheckCircle, Clock, Flame, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useTrackerStore } from "@/lib/store/tracker-store";
import { toast } from "sonner";

export function DailyGoals() {
  const [goal, setGoal] = useState(1);
  const [loading, setLoading] = useState(true);
  const platformStats = useTrackerStore((s) => s.platformStats);
  const activityLog = useTrackerStore((s) => s.activityLog);

  const today = new Date().toISOString().slice(0, 10);
  const todaySolved = activityLog[today] || 0;
  const totalStreak = Object.values(platformStats).reduce(
    (sum, s) => sum + (s?.currentStreak || 0),
    0
  );

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const completed = todaySolved >= goal;

  return (
    <Card className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardTitle className="text-base font-bold">Daily Goal</CardTitle>
          <p className="text-sm text-muted-foreground">
            {completed ? "Completed!" : `${goal - todaySolved} more to go`}
          </p>
        </div>
        <Flame className="h-5 w-5 text-orange-500" />
      </div>

      <div className="space-y-3">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary mb-2">
          <div
            className="absolute h-full bg-primary"
            style={{
              width: Math.min((todaySolved / goal) * 100, 100),
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {todaySolved} / {goal} solved today
          </span>
          <span className={cn("font-medium text-sm", completed ? "text-green-500" : "text-foreground")}>
            {completed ? "✓" : goal - todaySolved}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{todaySolved}</span>
            <span className="text-muted-foreground">solved today</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="font-medium">{totalStreak}</span>
            <span className="text-muted-foreground">combined streak</span>
          </div>
        </div>
      </div>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
            <input
              type="number"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value) || 1)}
              className="w-8 border rounded px-1 py-0.5 text-xs"
              min="1"
            />
            <span className="text-xs">goal</span>
          </label>
        </div>
        <Button
          size="sm"
          variant={completed ? "default" : "outline"}
          disabled={completed}
          onClick={() => {
            if (completed) {
              toast.success("Goal already completed!");
            } else {
              toast.success("Daily goal updated!");
            }
          }}
        >
          {completed ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Mark Complete
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}