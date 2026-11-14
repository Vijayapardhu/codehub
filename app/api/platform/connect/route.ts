import { NextRequest, NextResponse } from "next/server";
import {
  connectPlatform,
  disconnectPlatform,
  syncPlatform,
  syncAllPlatforms,
} from "@/lib/platform/service";
import { getAuthInstance, initFirebase } from "@/lib/firebase/config";

async function getCurrentUserId(req: NextRequest): Promise<string | null> {
  // Try to get user from Authorization header (Bearer token)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice(7);
    try {
      initFirebase();
      const auth = getAuthInstance();
      if (auth) {
        // Verify the ID token
        // Note: In production, use admin SDK to verify. For now, decode JWT payload
        const payload = JSON.parse(
          Buffer.from(idToken.split(".")[1], "base64").toString()
        );
        return payload.sub || payload.user_id || null;
      }
    } catch {
      // Token invalid, fall through
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, username, all, userId } = body;

    if (all) {
      const uid = userId || (await getCurrentUserId(req));
      const results = await syncAllPlatforms(uid || undefined);
      return NextResponse.json(results);
    }

    if (!platform || !username) {
      return NextResponse.json(
        { error: "Platform and username are required" },
        { status: 400 }
      );
    }

    const uid = userId || (await getCurrentUserId(req));
    const result = await connectPlatform(platform, username, uid || undefined);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Connect platform error:", error);
    return NextResponse.json(
      { error: error.message || "Failed", code: error.code },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, userId } = body;

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    const uid = userId || (await getCurrentUserId(req));
    await disconnectPlatform(platform, uid || undefined);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Disconnect platform error:", error);
    return NextResponse.json(
      { error: error.message || "Failed", code: error.code },
      { status: error.status || 500 }
    );
  }
}