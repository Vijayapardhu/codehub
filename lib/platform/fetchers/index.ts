export { fetchLeetCodeProfile } from "./leetcode";
export { fetchCodeChefProfile } from "./codechef";
export { fetchHackerRankProfile } from "./hackerrank";
export { fetchGitHubProfile } from "./github";

import type { Platform } from "../types";
import { fetchLeetCodeProfile } from "./leetcode";
import { fetchCodeChefProfile } from "./codechef";
import { fetchHackerRankProfile } from "./hackerrank";
import { fetchGitHubProfile } from "./github";

export async function fetchProfile(platform: Platform, username: string) {
  switch (platform) {
    case "leetcode":
      return fetchLeetCodeProfile(username);
    case "codechef":
      return fetchCodeChefProfile(username);
    case "hackerrank":
      return fetchHackerRankProfile(username);
    case "github":
      return fetchGitHubProfile(username);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}