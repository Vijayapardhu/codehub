import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

let app: ReturnType<typeof initializeApp> | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let messagingInstance: Messaging | null = null;

export function initFirebase() {
  if (app) return app;

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);

  // Messaging is browser-only
  if (typeof window !== "undefined") {
    isSupported().then((supported) => {
      if (supported && app) {
        messagingInstance = getMessaging(app);
      }
    });
  }

  return app;
}

export function getAuthInstance(): Auth | null {
  if (!authInstance) {
    initFirebase();
  }
  return authInstance;
}

export function getDbInstance(): Firestore | null {
  if (!dbInstance) {
    initFirebase();
  }
  return dbInstance;
}

export function getStorageInstance(): FirebaseStorage | null {
  if (!storageInstance) {
    initFirebase();
  }
  return storageInstance;
}

export function getMessagingInstance(): Messaging | null {
  return messagingInstance;
}