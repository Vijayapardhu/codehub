export type Platform = "github" | "leetcode" | "codechef" | "hackerrank";

export interface PlatformConnection {
  platform: Platform;
  username: string;
  connectedAt: string; // ISO timestamp
  lastSyncedAt?: string; // ISO timestamp
  enabled: boolean;
}

export interface LeetCodeProfile {
  username: string;
  realName?: string;
  avatar?: string;
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  streak: number;
  points: number;
  submissionNum: number;
  calendar: Record<string, number>; // date -> count
}

export interface CodeChefProfile {
  username: string;
  realName?: string;
  avatar?: string;
  totalSolved: number;
  rating: number;
  stars: number;
  rank: string;
  problemsSolved: number;
}

export interface HackerRankProfile {
  username: string;
  avatar?: string;
  totalSolved: number;
  badges: number;
  level: string;
  skills: { name: string; score: number }[];
}

export interface GitHubProfile {
  username: string;
  avatar: string;
  name?: string;
  followers: number;
  following: number;
  publicRepos: number;
  totalCommits: number;
  streak: number; // computed from contributions
  contributions: Record<string, number>; // date -> count
}

export interface PlatformStats {
  platform: Platform;
  username: string;
  totalSolved: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  fetchedAt: string;
  error?: string;
  // GitHub-specific fields
  totalCommits?: number;
  totalStars?: number;
  totalForks?: number;
  publicRepos?: number;
}