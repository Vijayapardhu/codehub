"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { initFirebase, getAuthInstance, getDbInstance } from "@/lib/firebase/config";
import type { UserProfile } from "@/lib/firebase/types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase on client
    initFirebase();
    
    const auth = getAuthInstance();
    const db = getDbInstance();
    
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Load user profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid));
          if (profileDoc.exists()) {
            setProfile({ id: profileDoc.id, ...profileDoc.data() } as UserProfile);
          } else {
            // Check for localStorage data to migrate
            const migratedData = migrateLocalStorageData();
            
            // Create default profile with migrated data if available
            const defaultProfile: UserProfile = {
              id: user.uid,
              email: user.email || "",
              displayName: user.displayName || "",
              ...(user.photoURL ? { photoURL: user.photoURL } : {}),
              createdAt: new Date().toISOString(),
              ...(migratedData?.college ? { college: migratedData.college } : {}),
              bio: undefined,
              platformConnections: migratedData?.platformConnections || {},
              dailyGoal: migratedData?.dailyGoal || 1,
              streak: migratedData?.streak || 0,
              longestStreak: migratedData?.longestStreak || 0,
              totalSolved: migratedData?.totalSolved || 0,
              friends: migratedData?.friends || [],
              rooms: migratedData?.rooms || [],
              notificationsEnabled: false,
              theme: "dark",
            };
            // Remove undefined values before saving to Firestore
            const cleanProfile = Object.fromEntries(
              Object.entries(defaultProfile).filter(([, v]) => v !== undefined)
            );
            try {
              await setDoc(doc(db, "users", user.uid), cleanProfile);
            } catch (firestoreError) {
              // Firestore might be offline, continue with local data
              console.warn("Firestore offline, using local profile only:", firestoreError);
            }
            setProfile(defaultProfile);
            
            // Clear localStorage after migration
            if (migratedData) {
              localStorage.removeItem("leetcode-tracker-store");
              toast.success("Your previous progress has been migrated!");
            }
          }
        } catch (firestoreError) {
          // Firestore offline - create local-only profile
          console.warn("Firestore offline:", firestoreError);
          const defaultProfile: UserProfile = {
            id: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || undefined,
            createdAt: new Date().toISOString(),
            college: undefined,
            bio: undefined,
            platformConnections: {},
            dailyGoal: 1,
            streak: 0,
            longestStreak: 0,
            totalSolved: 0,
            friends: [],
            rooms: [],
            notificationsEnabled: false,
            theme: "dark",
          };
          setProfile(defaultProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const auth = getAuthInstance();
    if (!auth) throw new Error("Firebase not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const auth = getAuthInstance();
    const db = getDbInstance();
    if (!auth || !db) throw new Error("Firebase not initialized");
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // Create user profile
    const profile: UserProfile = {
      id: userCredential.user.uid,
      email,
      displayName,
      createdAt: new Date().toISOString(),
      college: undefined,
      bio: undefined,
      platformConnections: {},
      dailyGoal: 1,
      streak: 0,
      longestStreak: 0,
      totalSolved: 0,
      friends: [],
      rooms: [],
      notificationsEnabled: false,
      theme: "dark",
    };
    try {
      await setDoc(doc(db, "users", userCredential.user.uid), profile);
    } catch (firestoreError) {
      console.warn("Firestore offline during signup:", firestoreError);
    }
  };

  const loginWithGoogle = async () => {
    const auth = getAuthInstance();
    const db = getDbInstance();
    if (!auth || !db) throw new Error("Firebase not initialized");
    
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if profile exists
    try {
      const profileDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (!profileDoc.exists()) {
        const profile: UserProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: userCredential.user.displayName || "",
          photoURL: userCredential.user.photoURL || undefined,
          createdAt: new Date().toISOString(),
          college: undefined,
          bio: undefined,
          platformConnections: {},
          dailyGoal: 1,
          streak: 0,
          longestStreak: 0,
          totalSolved: 0,
          friends: [],
          rooms: [],
          notificationsEnabled: false,
          theme: "dark",
        };
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), profile);
        } catch (firestoreError) {
          console.warn("Firestore offline during Google signup:", firestoreError);
        }
      }
    } catch (firestoreError) {
      console.warn("Firestore offline during Google login:", firestoreError);
    }
  };

  const loginWithGitHub = async () => {
    const auth = getAuthInstance();
    const db = getDbInstance();
    if (!auth || !db) throw new Error("Firebase not initialized");
    
    const provider = new GithubAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if profile exists
    try {
      const profileDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (!profileDoc.exists()) {
        const profile: UserProfile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || "",
          displayName: userCredential.user.displayName || "",
          photoURL: userCredential.user.photoURL || undefined,
          createdAt: new Date().toISOString(),
          college: undefined,
          bio: undefined,
          platformConnections: {},
          dailyGoal: 1,
          streak: 0,
          longestStreak: 0,
          totalSolved: 0,
          friends: [],
          rooms: [],
          notificationsEnabled: false,
          theme: "dark",
        };
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), profile);
        } catch (firestoreError) {
          console.warn("Firestore offline during GitHub signup:", firestoreError);
        }
      }
    } catch (firestoreError) {
      console.warn("Firestore offline during GitHub login:", firestoreError);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    const auth = getAuthInstance();
    const db = getDbInstance();
    if (!auth || !db) throw new Error("Firebase not initialized");
    
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    try {
      await updateDoc(doc(db, "users", user.uid), data);
    } catch (firestoreError) {
      console.warn("Firestore offline during profile update:", firestoreError);
    }
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
  };

  const logout = async () => {
    const auth = getAuthInstance();
    if (!auth) throw new Error("Firebase not initialized");
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        loginWithGoogle,
        loginWithGitHub,
        logout,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Migrate localStorage data from the old Zustand store to Firestore.
 * Returns migrated data or null if no localStorage data exists.
 */
function migrateLocalStorageData(): any | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem("leetcode-tracker-store");
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (!parsed) return null;
    
    // Extract relevant data from the old store
    const statusMap = parsed.statusMap || {};
    const bookmarks = parsed.bookmarks || {};
    const activityLog = parsed.activityLog || {};
    const preparingFor = parsed.preparingFor || [];
    
    // Calculate total solved from statusMap
    let totalSolved = 0;
    for (const key in statusMap) {
      if (statusMap[key] === "solved") totalSolved++;
    }
    
    // Calculate streak from activityLog
    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    let currentDate = new Date();
    while (true) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      if (activityLog[dateStr] && activityLog[dateStr] > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate longest streak from activityLog
    const dates = Object.keys(activityLog).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;
    
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      if (prevDate) {
        const diff = (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      prevDate = date;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    
    return {
      totalSolved,
      streak,
      longestStreak,
      preparingFor,
      platformConnections: parsed.platformConnections || {},
      college: undefined,
      friends: [],
      rooms: [],
      dailyGoal: 1,
    };
  } catch (error) {
    console.error("Failed to migrate localStorage data:", error);
    return null;
  }
}