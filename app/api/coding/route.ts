/**
 * Next.js API route: POST /api/coding
 *
 * Body:    { idToken, action, ... }
 * Actions: profile | link | settings | contests | daily | leaderboard
 *
 * Single endpoint for all coding platform operations.
 * Uses Firebase Admin SDK for auth verification and Firestore writes.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import {
  PLATFORM_IDS,
  fetchAllPlatforms,
  fetchContests,
  fetchDailyProblem,
} from "@/lib/platform/fetchers/_codingPlatforms";
import { withinRateLimit } from "@/lib/platform/sync";

const STATS_TTL_MS = 30 * 60_000;
const CONTESTS_TTL_MS = 6 * 60 * 60_000;
const DAILY_TTL_MS = 60 * 60_000;
const LEADERBOARD_LIMIT = 25;

const HANDLE_PATTERN = /^[A-Za-z0-9_.@-]{1,40}$/;

function emptyProfile(uid: string): any {
  return {
    id: uid,
    studentId: uid,
    handles: {},
    stats: [],
    recent: [],
    totalSolved: 0,
    weeklyTarget: 0,
    shareToLeaderboard: true,
    peerKey: null,
    refreshedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

// Initialize Firebase Admin once at module level
let adminApp: any = null;
function getAdminApp(): any {
  if (!adminApp) {
    if (getApps().length) {
      adminApp = getApps()[0];
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      adminApp = initializeApp({
        credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
      });
    }
  }
  return adminApp;
}

function safeParse(body: any): any {
  try {
    return typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return null;
  }
}

function peerKeyFor(student: any): string | null {
  const parts = [
    student?.collegeId,
    student?.department,
    student?.year,
    student?.section,
  ];
  if (parts.some((part) => part === undefined || part === null || part === ""))
    return null;
  return parts
    .map((part) => String(part).trim().toUpperCase())
    .join("|");
}

async function refreshProfile(db: any, uid: string, profile: any): Promise<any> {
  const { stats, recent, totalSolved } = await fetchAllPlatforms(
    profile.handles
  );
  const studentSnap = await db.doc(`students/${uid}`).get();

  const updated = {
    ...profile,
    stats,
    recent,
    totalSolved,
    peerKey:
      studentSnap.exists
        ? peerKeyFor(studentSnap.data())
        : profile.peerKey,
    refreshedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.doc(`codingProfiles/${uid}`).set(updated, { merge: true });
  return updated;
}

async function cached(
  db: any,
  key: string,
  ttlMs: number,
  produce: () => Promise<any>
): Promise<{ value: any; cached: boolean }> {
  const ref = db.doc(`codingCache/${key}`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;

  if (data && Date.now() - (data.fetchedAt ?? 0) < ttlMs) {
    return { value: data.value ?? null, cached: true };
  }

  const value = await produce();
  if (value === null && data) {
    return { value: data.value ?? null, cached: true };
  }

  await ref.set({ value, fetchedAt: Date.now() });
  return { value, cached: false };
}

async function readProfile(db: any, uid: string): Promise<any> {
  const snap = await db.doc(`codingProfiles/${uid}`).get();
  return snap.exists ? { ...emptyProfile(uid), ...snap.data() } : null;
}

async function handleProfile(db: any, uid: string, forceRefresh: boolean): Promise<any> {
  const profile = await readProfile(db, uid);
  if (!profile || Object.keys(profile.handles ?? {}).length === 0) {
    return {
      ok: true,
      linked: false,
      profile: profile ?? emptyProfile(uid),
    };
  }

  const fresh =
    profile.refreshedAt &&
    Date.now() - Date.parse(profile.refreshedAt) < STATS_TTL_MS;
  if (fresh && !forceRefresh) {
    return { ok: true, linked: true, profile, cached: true };
  }

  if (!(await withinRateLimit(db, `coding_${uid}`))) {
    return {
      ok: true,
      linked: true,
      profile,
      cached: true,
      rateLimited: true,
    };
  }

  return {
    ok: true,
    linked: true,
    profile: await refreshProfile(db, uid, profile),
  };
}

async function handleLink(db: any, uid: string, rawHandles: any): Promise<any> {
  const handles = cleanHandles(rawHandles);
  const existing = (await readProfile(db, uid)) ?? emptyProfile(uid);
  const profile = { ...existing, handles, updatedAt: new Date().toISOString() };

  if (Object.keys(handles).length === 0) {
    const cleared = {
      ...profile,
      stats: [],
      recent: [],
      totalSolved: 0,
      refreshedAt: null,
    };
    await db.doc(`codingProfiles/${uid}`).set(cleared, { merge: true });
    return { ok: true, linked: false, profile: cleared };
  }

  await db.doc(`codingProfiles/${uid}`).set(profile, { merge: true });
  return { ok: true, linked: true, profile: await refreshProfile(db, uid, profile) };
}

async function handleSettings(db: any, uid: string, payload: any): Promise<any> {
  const existing = (await readProfile(db, uid)) ?? emptyProfile(uid);
  const updates: any = { updatedAt: new Date().toISOString() };

  if (payload?.weeklyTarget !== undefined) {
    const target = Number(payload.weeklyTarget);
    updates.weeklyTarget =
      Number.isFinite(target)
        ? Math.min(200, Math.max(0, Math.round(target)))
        : 0;
  }
  if (payload?.shareToLeaderboard !== undefined) {
    updates.shareToLeaderboard = Boolean(payload.shareToLeaderboard);
  }

  await db
    .doc(`codingProfiles/${uid}`)
    .set({ ...existing, ...updates }, { merge: true });
  return { ok: true, profile: { ...existing, ...updates } };
}

async function handleLeaderboard(db: any, uid: string): Promise<any> {
  const profile = await readProfile(db, uid);
  if (!profile?.peerKey) {
    return { ok: true, entries: [], peerKey: null };
  }

  const snapshot = await db
    .collection("codingProfiles")
    .where("peerKey", "==", profile.peerKey)
    .where("shareToLeaderboard", "==", true)
    .orderBy("totalSolved", "desc")
    .limit(LEADERBOARD_LIMIT)
    .get();

  const students = await Promise.all(
    snapshot.docs.map((doc: any) => db.doc(`students/${doc.id}`).get())
  );

  const entries = snapshot.docs.map((doc: any, index: number) => {
    const student = students[index].exists ? students[index].data() : null;
    return {
      rollNumber: student?.rollNumber ?? "—",
      name: student?.name ?? "Classmate",
      totalSolved: doc.data().totalSolved ?? 0,
      isMe: doc.id === uid,
    };
  });

  return { ok: true, entries, peerKey: profile.peerKey, sharing: profile.shareToLeaderboard !== false };
}

function cleanHandles(raw: any): Record<string, string> {
  const handles: Record<string, string> = {};
  for (const platform of PLATFORM_IDS) {
    const value = String(raw?.[platform] ?? "").trim();
    if (!value) continue;
    if (!HANDLE_PATTERN.test(value))
      throw new Error(`invalid_handle_${platform}`);
    handles[platform] = value;
  }
  return handles;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  if (req.method !== "POST") {
    return NextResponse.json(
      { ok: false, error: "method_not_allowed" },
      { status: 405 }
    );
  }

  const bodyText = await req.text();
  const body = safeParse(bodyText);
  const authHeader = req.headers.get("authorization") || "";
  const idToken =
    authHeader.replace(/^Bearer /, "") || body?.idToken;
  if (!idToken) {
    return NextResponse.json(
      { ok: false, error: "missing_token" },
      { status: 401 }
    );
  }

  getAdminApp();
  const db = getFirestore();

  let caller: any;
  try {
    caller = await getAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_token" },
      { status: 401 }
    );
  }

  const uid = caller.uid;
  const action = String(body?.action ?? "profile");

  try {
    switch (action) {
      case "profile":
        return NextResponse.json(
          await handleProfile(db, uid, Boolean(body?.forceRefresh))
        );
      case "link":
        return NextResponse.json(
          await handleLink(db, uid, body?.handles)
        );
      case "settings":
        return NextResponse.json(
          await handleSettings(db, uid, body)
        );
      case "contests": {
        const result = await cached(
          db,
          "contests",
          CONTESTS_TTL_MS,
          () => fetchContests()
        );
        return NextResponse.json({
          ok: true,
          contests: result.value ?? [],
          cached: result.cached,
        });
      }
      case "daily": {
        const result = await cached(
          db,
          "daily",
          DAILY_TTL_MS,
          () => fetchDailyProblem()
        );
        return NextResponse.json({
          ok: true,
          daily: result.value ?? null,
          cached: result.cached,
        });
      }
      case "leaderboard":
        return NextResponse.json(await handleLeaderboard(db, uid));
      default:
        return NextResponse.json(
          { ok: false, error: "unknown_action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    const message = error?.message ?? "unknown";
    if (message.startsWith("invalid_handle_")) {
      return NextResponse.json(
        { ok: false, error: message },
        { status: 400 }
      );
    }
    console.error(`[coding] ${action} failed for ${uid}:`, message);
    return NextResponse.json(
      { ok: false, error: "coding_failed" },
      { status: 500 }
    );
  }
}