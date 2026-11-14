/**
 * Platform fetchers for coding platforms.
 * Fetches solved counts, streaks, and stats from each platform's public API/page.
 */

export const PLATFORM_IDS: string[] = ["github", "leetcode", "codechef", "hackerrank"];

const GITHUB_USER_AGENT = "Mozilla/5.0 (compatible; vijayaapardhu.dev)";
const LEETCODE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface PlatformResult {
  platform: string;
  username: string;
  totalSolved: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  error?: string;
}

async function fetchJSON(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** ---------- GitHub ---------- */
async function fetchGitHub(username: string): Promise<any> {
  const headers = {
    "User-Agent": GITHUB_USER_AGENT,
    Accept: "application/vnd.github.v3+json",
  };

  const user = await fetchJSON(
    `https://api.github.com/users/${username}`,
    headers
  );

  // Fetch events for contribution data
  let totalCommits = 0;
  const contributions: Record<string, number> = {};

  try {
    const eventsRes = await fetch(
      `https://api.github.com/users/${username}/events?per_page=100`,
      { headers }
    );
    if (eventsRes.ok) {
      const events = await eventsRes.json();
      for (const event of events) {
        if (event.type === "PushEvent" && event.payload?.commits) {
          totalCommits += event.payload.commits.length;
          const date = new Date(event.created_at).toISOString().slice(0, 10);
          contributions[date] =
            (contributions[date] || 0) + event.payload.commits.length;
        }
      }
    }
  } catch {
    // Events fetch failed, continue with available data
  }

  // Fetch repos for stars/forks
  let totalStars = 0;
  let totalForks = 0;
  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers }
    );
    if (reposRes.ok) {
      const repos = await reposRes.json();
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0;
        totalForks += repo.forks_count || 0;
      }
    }
  } catch {
    // Repos fetch failed
  }

  // Calculate streak
  const streak = calculateStreak(contributions);

  return {
    platform: "github",
    username,
    totalSolved: totalCommits,
    currentStreak: streak,
    longestStreak: streak,
    lastActiveDate: getLastActiveDate(contributions),
    totalCommits,
    totalStars,
    totalForks,
    publicRepos: user.public_repos || 0,
    fetchedAt: new Date().toISOString(),
  };
}

function calculateStreak(contributions: Record<string, number>): number {
  const dates = Object.keys(contributions).sort();
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (!contributions[todayStr] && !contributions[yesterdayStr]) return 0;

  let streak = 0;
  let checkDate = contributions[todayStr] ? today : yesterday;

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (!contributions[dateStr] || contributions[dateStr] === 0) break;
    streak++;
    checkDate = new Date(checkDate);
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function getLastActiveDate(
  contributions: Record<string, number>
): string | undefined {
  if (!contributions) return undefined;
  const dates = Object.keys(contributions).sort();
  return dates[dates.length - 1];
}

/** ---------- LeetCode ---------- */
async function fetchLeetCode(username: string): Promise<any> {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": LEETCODE_USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://leetcode.com/",
    Origin: "https://leetcode.com",
    Connection: "keep-alive",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "sec-ch-ua":
      '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-platform-version": '"10.0"',
  };

  const statsQuery = `
    query userContestRankingAndStats($username: String!) {
      matchedUser(username: $username) {
        username
        profile { realName avatar }
        submitStats {
          acSubmissionNum { count }
          totalSubmissionNum { count }
        }
      }
    }
  `;

  const statsRes = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: statsQuery,
      variables: { username },
    }),
  });

  if (!statsRes.ok) {
    throw new Error(`LeetCode GraphQL returned ${statsRes.status}`);
  }

  const statsData = await statsRes.json();
  if (statsData.errors || !statsData.data?.matchedUser) {
    throw new Error("User not found");
  }

  const matchedUser = statsData.data.matchedUser;
  const submitStats = matchedUser.submitStats || {};

  const acSubmissionNum = submitStats.acSubmissionNum?.[0]?.count || 0;
  const totalSubmissionNum = submitStats.totalSubmissionNum?.[0]?.count || 0;
  const easySolved = submitStats.acSubmissionNum?.[1]?.count || 0;
  const mediumSolved = submitStats.acSubmissionNum?.[2]?.count || 0;
  const hardSolved = submitStats.acSubmissionNum?.[3]?.count || 0;

  // Get calendar for streak
  let calendar: Record<string, number> = {};
  try {
    const calendarRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `
          query userCalendar($username: String!) {
            matchedUser(username: $username) { submissionCalendar }
          }
        `,
        variables: { username },
      }),
    });
    if (calendarRes.ok) {
      const calendarData = await calendarRes.json();
      if (!calendarData.errors && calendarData.data?.matchedUser) {
        calendar = JSON.parse(
          calendarData.data.matchedUser.submissionCalendar || "{}"
        );
      }
    }
  } catch {
    // Calendar optional
  }

  return {
    platform: "leetcode",
    username: matchedUser.username,
    totalSolved: acSubmissionNum,
    currentStreak: calculateStreakFromCalendar(calendar),
    longestStreak: calculateStreakFromCalendar(calendar),
    lastActiveDate: getLastActiveDate(calendar),
    easySolved,
    mediumSolved,
    hardSolved,
    points: acSubmissionNum,
    submissionNum: totalSubmissionNum,
    calendar,
    fetchedAt: new Date().toISOString(),
  };
}

function calculateStreakFromCalendar(
  calendar: Record<string, number>
): number {
  const dates = Object.keys(calendar).map(Number).sort((a, b) => a - b);
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = Math.floor(today.getTime() / 1000);

  const hasToday = calendar[todayTs] && calendar[todayTs] > 0;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTs = Math.floor(yesterday.getTime() / 1000);
  const hasYesterday = calendar[yesterdayTs] && calendar[yesterdayTs] > 0;

  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  let checkDate = hasToday ? today : yesterday;
  let checkTs = Math.floor(checkDate.getTime() / 1000);

  while (calendar[checkTs] && calendar[checkTs] > 0) {
    streak++;
    checkDate = new Date(checkDate);
    checkDate.setDate(checkDate.getDate() - 1);
    checkTs = Math.floor(checkDate.getTime() / 1000);
  }

  return streak;
}

/** ---------- CodeChef ---------- */
async function fetchCodeChef(username: string): Promise<any> {
  // Try API first
  try {
    const res = await fetch(
      `https://api.codechef.com/users/${username}`,
      {
        headers: {
          "User-Agent": GITHUB_USER_AGENT,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.status === "OK" && data.result) {
        const result = data.result;
        return {
          platform: "codechef",
          username: result.username,
          totalSolved: result.problemsSolved || 0,
          currentStreak: 0,
          longestStreak: 0,
          rating: result.rating || 0,
          stars: result.stars || 0,
          rank: result.rank || "0",
          problemsSolved: result.problemsSolved || 0,
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // API failed, fall through to HTML scraping
  }

  // Fallback: HTML scraping
  try {
    const profileRes = await fetch(
      `https://www.codechef.com/users/${username}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.codechef.com/",
          Connection: "keep-alive",
        },
      }
    );

    if (profileRes.ok) {
      const html = await profileRes.text();
      const problemsSolvedMatch = html.match(/(\d+)\s*problems?\s*solved/i);
      const ratingMatch = html.match(/rating[:\s]*(\d+)/i);
      const starsMatch = html.match(/(\d+)\s*★/i);

      return {
        platform: "codechef",
        username,
        totalSolved: problemsSolvedMatch
          ? parseInt(problemsSolvedMatch[1])
          : 0,
        currentStreak: 0,
        longestStreak: 0,
        rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
        stars: starsMatch ? parseInt(starsMatch[1]) : 0,
        rank: "0",
        problemsSolved: problemsSolvedMatch
          ? parseInt(problemsSolvedMatch[1])
          : 0,
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    // HTML scraping failed too
  }

  throw new Error(
    `CodeChef user "${username}" not found. Please verify your CodeChef username.`
  );
}

/** ---------- HackerRank ---------- */
async function fetchHackerRank(username: string): Promise<any> {
  try {
    const res = await fetch(
      `https://www.hackerrank.com/rest/users/${username}/scores`,
      {
        headers: {
          "User-Agent": GITHUB_USER_AGENT,
          Accept: "application/json",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const scores = data[0];
        const totalSolved = scores.solved || 0;
        const badges = scores.badges || 0;
        const level = scores.level || "0";

        let avatar: string | undefined;
        try {
          const infoRes = await fetch(
            `https://www.hackerrank.com/rest/users/${username}`,
            {
              headers: {
                "User-Agent": GITHUB_USER_AGENT,
                Accept: "application/json",
              },
            }
          );
          if (infoRes.ok) {
            const info = await infoRes.json();
            avatar = info.avatar || undefined;
          }
        } catch {
          // Ignore avatar fetch errors
        }

        const skills: { name: string; score: number }[] = [];
        if (scores.skills) {
          for (const [name, score] of Object.entries(scores.skills)) {
            skills.push({ name, score: score as number });
          }
        }

        return {
          platform: "hackerrank",
          username,
          avatar,
          totalSolved,
          currentStreak: 0,
          longestStreak: 0,
          badges,
          level,
          skills,
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // API failed, fall through to HTML scraping
  }

  // Fallback: HTML scraping
  try {
    const profileRes = await fetch(
      `https://www.hackerrank.com/${username}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.hackerrank.com/",
          Connection: "keep-alive",
        },
      }
    );

    if (profileRes.ok) {
      const html = await profileRes.text();
      const starsMatch = html.match(/(\d+)\s*★/i);
      const badgesMatch = html.match(/(\d+)\s*badge/i);

      return {
        platform: "hackerrank",
        username,
        avatar: undefined,
        totalSolved: starsMatch ? parseInt(starsMatch[1]) : 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: badgesMatch ? parseInt(badgesMatch[1]) : 0,
        level: "0",
        skills: [],
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    // HTML scraping failed too
  }

  throw new Error(
    `HackerRank user "${username}" not found. Please verify your HackerRank username.`
  );
}

/** ---------- Main fetchAllPlatforms ---------- */
export async function fetchAllPlatforms(
  handles: Record<string, string>
): Promise<{
  stats: any[];
  recent: any[];
  totalSolved: number;
}> {
  const stats: any[] = [];
  const recent: any[] = [];
  let totalSolved = 0;

  for (const [platform, username] of Object.entries(handles)) {
    if (!username) continue;

    try {
      let result: any;
      switch (platform) {
        case "github":
          result = await fetchGitHub(username);
          break;
        case "leetcode":
          result = await fetchLeetCode(username);
          break;
        case "codechef":
          result = await fetchCodeChef(username);
          break;
        case "hackerrank":
          result = await fetchHackerRank(username);
          break;
        default:
          continue;
      }

      stats.push({
        platform: result.platform,
        username: result.username,
        totalSolved: result.totalSolved || 0,
        currentStreak: result.currentStreak || 0,
        longestStreak: result.longestStreak || 0,
        lastActiveDate: result.lastActiveDate,
        fetchedAt: result.fetchedAt,
        ...(result.totalCommits !== undefined && { totalCommits: result.totalCommits }),
        ...(result.totalStars !== undefined && { totalStars: result.totalStars }),
        ...(result.totalForks !== undefined && { totalForks: result.totalForks }),
        ...(result.publicRepos !== undefined && { publicRepos: result.publicRepos }),
        ...(result.rating !== undefined && { rating: result.rating }),
        ...(result.badges !== undefined && { badges: result.badges }),
        ...(result.level !== undefined && { level: result.level }),
        ...(result.skills !== undefined && { skills: result.skills }),
        ...(result.easySolved !== undefined && { easySolved: result.easySolved }),
        ...(result.mediumSolved !== undefined && { mediumSolved: result.mediumSolved }),
        ...(result.hardSolved !== undefined && { hardSolved: result.hardSolved }),
      });

      recent.push({
        platform: result.platform,
        username: result.username,
        totalSolved: result.totalSolved || 0,
        updatedAt: result.fetchedAt,
      });

      totalSolved += result.totalSolved || 0;
    } catch (error: any) {
      stats.push({
        platform,
        username,
        totalSolved: 0,
        currentStreak: 0,
        longestStreak: 0,
        fetchedAt: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  return { stats, recent, totalSolved };
}

/** ---------- Contests & Daily ---------- */
export async function fetchContests(): Promise<any[]> {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": LEETCODE_USER_AGENT,
        "Accept": "application/json",
        "Referer": "https://leetcode.com/",
        "Origin": "https://leetcode.com",
      },
      body: JSON.stringify({
        query: `
          query upcomingContests {
            allContests {
              title
              startTime
              duration
            }
          }
        `,
        variables: {},
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.errors && data.data?.allContests) {
        return data.data.allContests;
      }
    }
  } catch {
    // Contests fetch failed
  }
  return [];
}

export async function fetchDailyProblem(): Promise<any> {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": LEETCODE_USER_AGENT,
        "Accept": "application/json",
        "Referer": "https://leetcode.com/",
        "Origin": "https://leetcode.com",
      },
      body: JSON.stringify({
        query: `
          query questionOfToday {
            activeDailyCodingChallengeQuestion {
              date
              link
              question {
                title
                titleSlug
                difficulty
              }
            }
          }
        `,
        variables: {},
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.errors && data.data?.activeDailyCodingChallengeQuestion) {
        return data.data.activeDailyCodingChallengeQuestion;
      }
    }
  } catch {
    // Daily problem fetch failed
  }
  return null;
}