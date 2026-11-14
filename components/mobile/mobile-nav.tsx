"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth";
import {
  LayoutDashboard,
  Building2,
  SearchCode,
  Bookmark,
  Target,
  Settings,
  Users,
  Calendar,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/questions", label: "Questions", icon: SearchCode },
  { href: "/rooms", label: "Rooms", icon: Users },
  { href: "/prep", label: "Prep", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Don't show on desktop
  if (!isMobile) return null;

  // Don't show on auth pages
  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive && "scale-110"
                )}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileTopHeader() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) return null;
  if (pathname === "/login" || pathname === "/signup") return null;

  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/companies": "Companies",
    "/questions": "Questions",
    "/bookmarks": "Bookmarks",
    "/prep": "Preparing For",
    "/rooms": "Study Rooms",
    "/settings": "Settings",
    "/profile": "Profile",
  };

  const currentTitle = titles[pathname] || "prep";

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <span className="text-lg font-bold">p</span>
          </div>
          <span className="text-lg font-bold">prep</span>
        </div>
        <div className="flex items-center gap-2">
          {user && profile && (
            <Link href="/profile" className="flex items-center gap-2">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {profile.displayName?.charAt(0) || "U"}
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}