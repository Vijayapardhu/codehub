import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Status } from "@/lib/types";
import type {
  Platform,
  PlatformConnection,
  PlatformStats,
} from "@/lib/platform/types";
import { firebaseCache, CACHE_KEYS } from "@/lib/firebase/cache";
import { getDbInstance } from "@/lib/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";

function statusKey(companySlug: string, questionSlug: string) {
  return `${companySlug}:${questionSlug}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

interface TrackerState {
  version: 3;
  statusMap: Record<string, "solved">;
  bookmarks: Record<string, true>;
  activityLog: Record<string, number>;
  preparingFor: string[];

  // Platform connections
  platformConnections: Record<Platform, PlatformConnection | null>;
  platformStats: Record<Platform, PlatformStats | null>;

  // Sync state
  isSyncing: boolean;
  lastSync: Record<Platform, number>;

  // Actions
  getStatus: (companySlug: string, questionSlug: string) => Status;
  toggleCompleted: (companySlug: string, questionSlug: string) => void;
  isBookmarked: (questionSlug: string) => boolean;
  toggleBookmark: (questionSlug: string) => void;
  addPreparingFor: (companySlug: string) => void;
  removePreparingFor: (companySlug: string) => void;
  getCompanyProgress: (
    companySlug: string,
    questionSlugs: string[]
  ) => { solved: number; total: number };

  // Platform actions
  setPlatformConnection: (
    platform: Platform,
    connection: PlatformConnection | null
  ) => void;
  removePlatformConnection: (platform: Platform) => void;
  setPlatformStats: (platform: Platform, stats: PlatformStats | null) => void;
  getPlatformStats: (platform: Platform) => PlatformStats | null;
  getPlatformConnection: (
    platform: Platform
  ) => PlatformConnection | null;
  isPlatformConnected: (platform: Platform) => boolean;

  // Firestore sync actions
  syncToFirestore: (userId: string) => Promise<void>;
  loadFromFirestore: (userId: string) => Promise<void>;
  setSyncing: (syncing: boolean) => void;
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      version: 3,
      statusMap: {},
      bookmarks: {},
      activityLog: {},
      preparingFor: [],
      platformConnections: {
        github: null,
        leetcode: null,
        codechef: null,
        hackerrank: null,
      },
      platformStats: {
        github: null,
        leetcode: null,
        codechef: null,
        hackerrank: null,
      },
      isSyncing: false,
      lastSync: {
        github: 0,
        leetcode: 0,
        codechef: 0,
        hackerrank: 0,
      },

      getStatus: (companySlug, questionSlug) => {
        const key = statusKey(companySlug, questionSlug);
        return get().statusMap[key] === "solved" ? "solved" : "not_started";
      },

      toggleCompleted: (companySlug, questionSlug) => {
        const key = statusKey(companySlug, questionSlug);
        const isSolved = get().statusMap[key] === "solved";

        set((state) => {
          const statusMap = { ...state.statusMap };
          if (isSolved) {
            delete statusMap[key];
          } else {
            statusMap[key] = "solved";
          }

          let activityLog = state.activityLog;
          if (!isSolved) {
            const day = todayKey();
            activityLog = { ...activityLog, [day]: (activityLog[day] ?? 0) + 1 };
          }

          return { statusMap, activityLog };
        });
      },

      isBookmarked: (questionSlug) => Boolean(get().bookmarks[questionSlug]),

      toggleBookmark: (questionSlug) => {
        set((state) => {
          const bookmarks = { ...state.bookmarks };
          if (bookmarks[questionSlug]) {
            delete bookmarks[questionSlug];
          } else {
            bookmarks[questionSlug] = true;
          }
          return { bookmarks };
        });
      },

      addPreparingFor: (companySlug) => {
        set((state) =>
          state.preparingFor.includes(companySlug)
            ? state
            : { preparingFor: [...state.preparingFor, companySlug] }
        );
      },

      removePreparingFor: (companySlug) => {
        set((state) => ({
          preparingFor: state.preparingFor.filter((s) => s !== companySlug),
        }));
      },

      getCompanyProgress: (companySlug, questionSlugs) => {
        const statusMap = get().statusMap;
        let solved = 0;
        for (const qSlug of questionSlugs) {
          if (statusMap[statusKey(companySlug, qSlug)] === "solved") solved++;
        }
        return { solved, total: questionSlugs.length };
      },

      // Platform actions
      setPlatformConnection: (platform, connection) => {
        set((state) => ({
          platformConnections: {
            ...state.platformConnections,
            [platform]: connection,
          },
        }));
      },

      removePlatformConnection: (platform) => {
        set((state) => ({
          platformConnections: {
            ...state.platformConnections,
            [platform]: null,
          },
          platformStats: {
            ...state.platformStats,
            [platform]: null,
          },
        }));
      },

      setPlatformStats: (platform, stats) => {
        set((state) => ({
          platformStats: {
            ...state.platformStats,
            [platform]: stats,
          },
          lastSync: {
            ...state.lastSync,
            [platform]: Date.now(),
          },
        }));
      },

      getPlatformStats: (platform) => get().platformStats[platform],

      getPlatformConnection: (platform) =>
        get().platformConnections[platform],

      isPlatformConnected: (platform) =>
        get().platformConnections[platform] !== null,

      loadPlatformConnections: async (userId: string) => {
        const db = getDbInstance();
        if (!db) return;

        try {
          const docSnap = await getDoc(doc(db, "platformConnections", userId));
          if (docSnap.exists()) {
            const data = docSnap.data() as { connections?: Record<string, any> };
            const connections = data.connections || {};
            for (const [platform, conn] of Object.entries(connections)) {
              set((state) => ({
                platformConnections: {
                  ...state.platformConnections,
                  [platform]: conn as PlatformConnection,
                },
              }));
            }
          }
        } catch (error) {
          console.error("Failed to load platform connections:", error);
        }
      },

      // Firestore sync actions
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      syncToFirestore: async (userId) => {
        const state = get();
        set({ isSyncing: true });

        try {
          const db = getDbInstance();
          if (!db) return;

          const batch = [
            setDoc(doc(db, "userData", userId), {
              statusMap: state.statusMap,
              bookmarks: state.bookmarks,
              activityLog: state.activityLog,
              preparingFor: state.preparingFor,
              updatedAt: new Date().toISOString(),
            }),
          ];

          // Sync platform connections and stats
          for (const platform of Object.keys(state.platformConnections) as Platform[]) {
            const connection = state.platformConnections[platform];
            const stats = state.platformStats[platform];

            batch.push(
              setDoc(doc(db, `platformData/${userId}_${platform}`), {
                connection,
                stats,
                updatedAt: new Date().toISOString(),
              })
            );
          }

          await Promise.all(batch);
        } catch (error) {
          console.error("Failed to sync to Firestore:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      loadFromFirestore: async (userId) => {
        const db = getDbInstance();
        if (!db) return;

        try {
          const [userDoc, ...platformDocs] = await Promise.all([
            getDoc(doc(db, "userData", userId)),
            ...(Object.keys(get().platformConnections) as Platform[]).map((platform) =>
              getDoc(doc(db, `platformData/${userId}_${platform}`))
            ),
          ]);

          if (userDoc.exists()) {
            const data = userDoc.data();
            set({
              statusMap: data.statusMap || {},
              bookmarks: data.bookmarks || {},
              activityLog: data.activityLog || {},
              preparingFor: data.preparingFor || [],
            });
          }

          // Load platform data
          const platforms: Platform[] = ["github", "leetcode", "codechef", "hackerrank"];
          platforms.forEach((platform, index) => {
            const docSnap = platformDocs[index];
            if (docSnap.exists()) {
              const data = docSnap.data();
              set((state) => ({
                platformConnections: {
                  ...state.platformConnections,
                  [platform]: data.connection || null,
                },
                platformStats: {
                  ...state.platformStats,
                  [platform]: data.stats || null,
                },
              }));
            }
          });
        } catch (error) {
          console.error("Failed to load from Firestore:", error);
        }
      },
    }),
    {
      name: "leetcode-tracker-store",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        version: state.version,
        statusMap: state.statusMap,
        bookmarks: state.bookmarks,
        activityLog: state.activityLog,
        preparingFor: state.preparingFor,
        platformConnections: state.platformConnections,
        platformStats: state.platformStats,
      }),
      migrate: (persisted: any) => {
        const state = persisted as {
          statusMap?: Record<string, string>;
          platformConnections?: Record<Platform, PlatformConnection | null>;
          platformStats?: Record<Platform, PlatformStats | null>;
        };

        const statusMap = Object.fromEntries(
          Object.entries(state.statusMap ?? {}).filter(
            ([, v]) => v === "solved"
          )
        );

        const platformConnections: Record<Platform, PlatformConnection | null> = {
          github: state.platformConnections?.github ?? null,
          leetcode: state.platformConnections?.leetcode ?? null,
          codechef: state.platformConnections?.codechef ?? null,
          hackerrank: state.platformConnections?.hackerrank ?? null,
        };

        const platformStats: Record<Platform, PlatformStats | null> = {
          github: state.platformStats?.github ?? null,
          leetcode: state.platformStats?.leetcode ?? null,
          codechef: state.platformStats?.codechef ?? null,
          hackerrank: state.platformStats?.hackerrank ?? null,
        };

        return {
          ...state,
          statusMap,
          platformConnections,
          platformStats,
          version: 3,
        };
      },
    }
  )
);