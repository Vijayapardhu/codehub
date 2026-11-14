"use client";

import { useState, useEffect } from "react";
import { useTrackerStore } from "@/lib/store/tracker-store";
import {
  Building2,
  Users,
  Trophy,
  Flame,
  Target,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  getColleges,
  joinStudyRoom,
  createStudyRoom,
  getStudyRoom,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";

export function RoomsView() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");

  const { addPreparingFor, preparingFor } = useTrackerStore((s) => ({
    addPreparingFor: s.addPreparingFor,
    preparingFor: s.preparingFor,
  }));

  useEffect(() => {
    loadColleges();
  }, []);

  const loadColleges = async () => {
    try {
      const data = await getColleges();
      setColleges(data);
    } catch (error) {
      console.error("Failed to load colleges:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase())
  );

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    try {
      await joinStudyRoom(roomId, user.uid);
      toast.success("Joined study room!");
      router.push(`/rooms/${roomId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join room");
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return;
    try {
      const room = await createStudyRoom({
        name: newRoomName,
        creatorId: user.uid,
        members: [user.uid],
        settings: { isPrivate: false, allowInvites: true },
        college: profile?.college || undefined,
        createdAt: new Date().toISOString(),
      });
      toast.success("Room created!");
      setNewRoomName("");
      router.push(`/rooms/${room.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create room");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Study Rooms</h2>
          <p className="text-muted-foreground">
            Connect with peers, join college cohorts, and track progress together.
          </p>
        </div>
      </div>

      {/* Create Room Card */}
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle>Create a Study Room</CardTitle>
          <CardDescription>
            Start a room for your college cohort or study group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Room name (e.g., IIIT DSA Warriors)"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateRoom} disabled={!newRoomName.trim() || !user}>
              Create Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* College Cohorts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              College Cohorts
            </h3>
          </div>
          <Input
            placeholder="Search colleges..."
            value={collegeSearch}
            onChange={(e) => setCollegeSearch(e.target.value)}
            className="w-64"
          />
        </div>

        <div className="grid gap-4">
          {filteredColleges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No colleges found
            </div>
          ) : (
            filteredColleges.map((college) => (
              <Card key={college.id} className="rounded-xl border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-sm">
                          {college.memberCount} members
                        </Badge>
                        {college.settings?.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {college.name}
                      </h3>
                      {college.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {college.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {college.memberCount}
                      </div>
                      <p className="text-xs text-muted-foreground">students</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Active study group
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJoinRoom(college.id)}
                      className="px-3"
                    >
                      Join Cohort
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Quick Join - Popular Rooms */}
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader>
          <CardTitle>Quick Join Rooms</CardTitle>
          <CardDescription>
            Join popular community study rooms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: "DSA Warriors", members: 124, tag: "LeetCode", color: "bg-orange-500/10 text-orange-500" },
            { name: "CodeChef Champions", members: 89, tag: "CodeChef", color: "bg-green-500/10 text-green-500" },
            { name: "GitHub Contributors", members: 156, tag: "GitHub", color: "bg-gray-500/10 text-gray-500" },
            { name: "HackerRank Elite", members: 203, tag: "HackerRank", color: "bg-green-500/10 text-green-500" },
          ].map((room, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${room.color}`}>
                  {room.tag.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{room.name}</h4>
                  <p className="text-xs text-muted-foreground">{room.members} members • {room.tag}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="px-3">
                Join
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}