"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Trophy, Search, ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/lib/firebase/auth";
import { getColleges, getCollege } from "@/lib/firebase/firestore";

export function CollegesView() {
  const { user, profile } = useAuth();
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadColleges();
  }, []);

  const loadColleges = async () => {
    try {
      const data = await getColleges();
      setColleges(data);
    } catch (error) {
      console.error("Failed to load colleges:", error);
      toast.error("Failed to load colleges");
    } finally {
      setLoading(false);
    }
  };

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleJoinCollege = async (collegeId: string) => {
    if (!user) return;
    try {
      const college = await getCollege(collegeId);
      if (!college) {
        toast.error("College not found");
        return;
      }
      
      // Add user to college (update user profile)
      // For now, just show success and redirect to rooms
      toast.success(`Joined ${college.name} cohort!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join college");
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">College Cohorts</h2>
          <p className="text-muted-foreground">
            Join your college community and compete with peers on leaderboards.
          </p>
        </div>
        <Button asChild>
          <Link href="/rooms">
            <ArrowRight className="mr-2 h-4 w-4" />
            Browse Study Rooms
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search colleges..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-border bg-card p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Colleges</p>
                <p className="text-2xl font-bold text-foreground">{colleges.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border bg-card p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground">
                  {colleges.reduce((sum, c) => sum + (c.memberCount || 0), 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border bg-card p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your College</p>
                <p className="text-lg font-bold text-foreground">
                  {profile?.college || "Not set"}
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* College List */}
      <div className="space-y-3">
        {filteredColleges.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No colleges found</p>
          </div>
        ) : (
          filteredColleges.map((college) => (
            <Card key={college.id} className="rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer group">
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
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {college.name}
                    </h3>
                    {college.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {college.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {college.memberCount}
                    </div>
                    <p className="text-xs text-muted-foreground">students</p>
                  </div>
                </div>
                <CardFooter className="pt-4 border-t border-border/50">
                  <Button
                    onClick={() => handleJoinCollege(college.id)}
                    className="w-full py-2"
                  >
                    Join Cohort <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}