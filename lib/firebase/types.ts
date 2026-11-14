export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  college?: string;
  bio?: string;
  platformConnections: Record<string, any>;
  dailyGoal: number;
  streak: number;
  longestStreak: number;
  totalSolved: number;
  friends: string[];
  rooms: string[];
  notificationsEnabled: boolean;
  theme: "dark" | "light";
  createdAt: string;
  updatedAt?: string;
}

export interface DailyGoal {
  id: string;
  userId: string;
  date: string;
  target: number;
  completed: number;
  type: "solved" | "commits" | "problems";
  createdAt: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  description?: string;
  college?: string;
  creatorId: string;
  members: string[];
  createdAt: string;
  settings: {
    isPrivate: boolean;
    allowInvites: boolean;
  };
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  type: "text" | "system";
}

export interface College {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  description?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "goal" | "streak" | "room" | "friend" | "system";
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}