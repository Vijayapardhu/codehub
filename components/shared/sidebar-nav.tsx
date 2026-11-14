"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2,
  LayoutDashboard,
  Building2,
  SearchCode,
  Bookmark,
  Target,
  Search,
  Settings,
  LogOut,
  User,
  Bell,
  Users,
  GraduationCap,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/shared/command-palette";
import { useCompaniesIndex } from "@/lib/data/use-companies-index";
import { useAuth } from "@/lib/firebase/auth";
import { signOut, getAuth } from "firebase/auth";
import { initFirebase, getAuthInstance } from "@/lib/firebase/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
  { href: "/companies", label: "Companies", icon: Building2, auth: true },
  { href: "/questions", label: "Questions", icon: SearchCode, auth: true },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark, auth: true },
  { href: "/prep", label: "Preparing for", icon: Target, auth: true },
  { href: "/rooms", label: "Study Rooms", icon: Users, auth: true },
  { href: "/colleges", label: "Colleges", icon: GraduationCap, auth: true },
  { href: "/settings", label: "Settings", icon: Settings, auth: true },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const companies = useCompaniesIndex();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    try {
      initFirebase();
      const auth = getAuthInstance();
      if (auth) {
        await signOut(auth);
      }
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Don't show sidebar on auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-4">
      <Link
        href="/"
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"
      >
        <Code2 className="h-5 w-5" />
      </Link>

      <NavIconButton
        label="Search (⌘K)"
        onClick={() => setPaletteOpen(true)}
        icon={Search}
      />

      <div className="my-1 h-px w-8 bg-border" />

      <nav className="flex flex-col items-center gap-1">
        {LINKS.map((link) => {
          // Only show auth-required links when user is loaded and authenticated
          if (link.auth && !loading && !user) return null;
          return (
            <NavIconLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={pathname === link.href}
            />
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        {user && profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {profile.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{profile.displayName}</span>
                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!loading && !user && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>

      <CommandPalette companies={companies} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </aside>
  );
}

function NavIconLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-sidebar-accent text-primary"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          {active && (
            <span className="absolute -left-2 h-5 w-0.5 rounded-full bg-primary" />
          )}
          <Icon className="h-[18px] w-[18px]" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavIconButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Search;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Icon className="h-[18px] w-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}