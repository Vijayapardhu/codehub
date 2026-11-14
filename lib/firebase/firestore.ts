import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDbInstance } from "@/lib/firebase/config";
import type {
  UserProfile,
  DailyGoal,
  StudyRoom,
  RoomMessage,
  College,
  FriendRequest,
  Notification,
} from "@/lib/firebase/types";

// User profile operations
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(getDbInstance()!, "users", userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  await updateDoc(doc(getDbInstance()!, "users", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Daily goals
export async function getTodaysGoal(userId: string): Promise<DailyGoal | null> {
  const today = new Date().toISOString().slice(0, 10);
  const q = query(
    collection(getDbInstance()!, "dailyGoals"),
    where("userId", "==", userId),
    where("date", "==", today),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as DailyGoal;
  }
  return null;
}

export async function createDailyGoal(
  userId: string,
  target: number,
  type: DailyGoal["type"]
): Promise<DailyGoal> {
  const today = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();
  const goal: DailyGoal = {
    id,
    userId,
    date: today,
    target,
    completed: 0,
    type,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(getDbInstance()!, "dailyGoals", id), goal);
  return goal;
}

export async function incrementGoalProgress(
  goalId: string,
  amount: number = 1
): Promise<void> {
  await updateDoc(doc(getDbInstance()!, "dailyGoals", goalId), {
    completed: increment(amount),
  });
}

// Study rooms
export async function createStudyRoom(
  room: Omit<StudyRoom, "id">
): Promise<StudyRoom> {
  const id = crypto.randomUUID();
  const fullRoom: StudyRoom = {
    id,
    ...room,
  };
  await setDoc(doc(getDbInstance()!, "rooms", id), fullRoom);
  return fullRoom;
}

export async function getStudyRoom(roomId: string): Promise<StudyRoom | null> {
  const docRef = doc(getDbInstance()!, "rooms", roomId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as StudyRoom;
  }
  return null;
}

export async function joinStudyRoom(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getStudyRoom(roomId);
  if (!room) return;
  await updateDoc(doc(getDbInstance()!, "rooms", roomId), {
    members: [...room.members, userId],
  });
}

export function subscribeToRoomMessages(
  roomId: string,
  callback: (messages: RoomMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(getDbInstance()!, "roomMessages"),
    where("roomId", "==", roomId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RoomMessage[];
    callback(messages);
  });
}

export async function sendRoomMessage(
  roomId: string,
  userId: string,
  userName: string,
  text: string
): Promise<void> {
  await setDoc(doc(collection(getDbInstance()!, "roomMessages")), {
    roomId,
    userId,
    userName,
    text,
    createdAt: new Date().toISOString(),
    type: "text",
  });
}

// Colleges
export async function getColleges(): Promise<College[]> {
  const snapshot = await getDocs(collection(getDbInstance()!, "colleges"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as College[];
}

export async function getCollege(collegeId: string): Promise<College | null> {
  const docRef = doc(getDbInstance()!, "colleges", collegeId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as College;
  }
  return null;
}

// Friends
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  await setDoc(doc(collection(getDbInstance()!, "friendRequests")), {
    fromUserId,
    toUserId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export async function acceptFriendRequest(
  requestId: string,
  userId: string,
  friendId: string
): Promise<void> {
  const batch = writeBatch(getDbInstance()!);
  
  // Update request status
  batch.update(doc(getDbInstance()!, "friendRequests", requestId), { status: "accepted" });
  
  // Add to both users' friend lists
  batch.update(doc(getDbInstance()!, "users", userId), {
    friends: [...(await getUserProfile(userId))?.friends || [], friendId],
  });
  batch.update(doc(getDbInstance()!, "users", friendId), {
    friends: [...(await getUserProfile(friendId))?.friends || [], userId],
  });
  
  await batch.commit();
}

// Notifications
export async function getNotifications(
  userId: string,
  limitCount: number = 20
): Promise<Notification[]> {
  const q = query(
    collection(getDbInstance()!, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Notification[];
}

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  await updateDoc(doc(getDbInstance()!, "notifications", notificationId), { read: true });
}

export async function createNotification(
  notification: Omit<Notification, "id">
): Promise<void> {
  await setDoc(doc(collection(getDbInstance()!, "notifications")), {
    ...notification,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(getDbInstance()!, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    callback(notifications);
  });
}