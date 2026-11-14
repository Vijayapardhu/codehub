import { NextRequest, NextResponse } from "next/server";
import {
  fetchLeetCodeProfile,
  fetchCodeChefProfile,
  fetchHackerRankProfile,
  fetchGitHubProfile,
} from "@/lib/platform/fetchers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string; username: string }> }
) {
  const { platform, username } = await params;

  if (!platform || !username) {
    return NextResponse.json(
      { error: "Platform and username are required" },
      { status: 400 }
    );
  }

  try {
    let profile;
    switch (platform) {
      case "leetcode":
        profile = await fetchLeetCodeProfile(username);
        break;
      case "codechef":
        profile = await fetchCodeChefProfile(username);
        break;
      case "hackerrank":
        profile = await fetchHackerRankProfile(username);
        break;
      case "github":
        profile = await fetchGitHubProfile(username);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown platform: ${platform}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ platform, profile });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile", code: error.code },
      { status: error.status || 500 }
    );
  }
}