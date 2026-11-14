import { NextRequest, NextResponse } from "next/server";
import { syncPlatform, syncAllPlatforms } from "@/lib/platform/service";
import { getAuthInstance, initFirebase, getDbInstance } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";

async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    try {
      initFirebase();
      const auth = getAuthInstance();
      if (auth) {
        const payload = JSON.parse(
          Buffer.from(idToken.split(".")[1], "base64").toString()
        );
        return payload.sub || payload.user_id || null;
      }
    } catch {
      // Token invalid
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, all, userId, username } = body;

    if (all) {
      const uid = userId || (await getCurrentUserId(req));
      const results = await syncAllPlatforms(uid || undefined);
      return NextResponse.json(results);
    }

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    const uid = userId || (await getCurrentUserId(req));

    // If no username provided, try to look it up from Firestore single document
    let resolvedUsername = username;
    if (!resolvedUsername && uid) {
      try {
        const db = getDbInstance();
        if (db) {
          const docSnap = await getDoc(doc(db, "platformConnections", uid));
          if (docSnap.exists()) {
            const data = docSnap.data() as { connections?: Record<string, any> };
            resolvedUsername = data.connections?.[platform]?.username;
          }
        }
      } catch {
        // Ignore lookup errors
      }
    }

    if (!resolvedUsername) {
      return NextResponse.json(
        { error: "Username not found. Please connect your account first." },
        { status: 400 }
      );
    }

    try {
      const result = await syncPlatform(platform, uid || undefined, resolvedUsername);
      return NextResponse.json(result);
    } catch (error: any) {
      // Return partial result with 0 stats instead of failing entirely
      if (error.code === "USER_NOT_FOUND" || error.code === "SYNC_FAILED") {
        return NextResponse.json({
          platform,
          username: resolvedUsername,
          totalSolved: 0,
          currentStreak: 0,
          longestStreak: 0,
          fetchedAt: new Date().toISOString(),
          error: error.message,
        });
      }
      return NextResponse.json(
        { error: error.message || "Failed", code: error.code },
        { status: error.status || 500 }
      );
    }
  } catch (error: any) {
    console.error("Sync platform error:", error);
    return NextResponse.json(
      { error: error.message || "Failed", code: error.code },
      { status: error.status || 500 }
    );
  }
}