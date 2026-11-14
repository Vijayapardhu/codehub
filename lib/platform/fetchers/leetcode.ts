/**
 * LeetCode API client - Direct scraping from LeetCode.com
 * No third-party dependencies - works directly from server
 */

export interface LeetCodeProfileData {
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
  calendar: Record<string, number>;
}

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const LEETCODE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const LEETCODE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://leetcode.com/",
  "Origin": "https://leetcode.com",
  "Connection": "keep-alive",
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

export async function fetchLeetCodeProfile(
  username: string
): Promise<LeetCodeProfileData> {
  // Method 1: Try LeetCode GraphQL API with full browser headers
  try {
    const profile = await fetchLeetCodeGraphQL(username);
    if (profile && profile.totalSolved >= 0) {
      return profile;
    }
  } catch (graphqlError: any) {
    console.warn("LeetCode GraphQL failed:", graphqlError.message);
    // GraphQL failed, fall through to HTML scraping
  }

  // Method 2: Scrape LeetCode profile page HTML
  try {
    const profile = await fetchLeetCodeHTML(username);
    if (profile && profile.totalSolved >= 0) {
      return profile;
    }
  } catch (htmlError: any) {
    console.warn("LeetCode HTML scraping failed:", htmlError.message);
    // HTML scraping failed too
  }

  throw new Error(
    `LeetCode user "${username}" not found. Please verify your LeetCode username.`
  );
}

async function fetchLeetCodeGraphQL(
  username: string
): Promise<LeetCodeProfileData> {
  const statsQuery = `
    query userContestRankingAndStats($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          avatar
        }
        submitStats {
          acSubmissionNum {
            count
          }
          totalSubmissionNum {
            count
          }
        }
      }
    }
  `;

  const statsRes = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: LEETCODE_HEADERS,
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
    throw new Error("User not found in GraphQL response");
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
    const calendarRes = await fetch(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers: LEETCODE_HEADERS,
      body: JSON.stringify({
        query: `
          query userCalendar($username: String!) {
            matchedUser(username: $username) {
              submissionCalendar
            }
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
    username: matchedUser.username,
    realName: matchedUser.profile?.realName,
    avatar: matchedUser.profile?.avatar,
    totalSolved: acSubmissionNum,
    totalQuestions: totalSubmissionNum,
    easySolved,
    mediumSolved,
    hardSolved,
    streak: calculateStreak(calendar),
    points: acSubmissionNum,
    submissionNum: totalSubmissionNum,
    calendar,
  };
}

async function fetchLeetCodeHTML(
  username: string
): Promise<LeetCodeProfileData> {
  const profileRes = await fetch(`https://leetcode.com/${username}/`, {
    headers: {
      "User-Agent": LEETCODE_USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://leetcode.com/",
      "Connection": "keep-alive",
    },
  });

  if (!profileRes.ok) {
    throw new Error(`LeetCode profile page returned ${profileRes.status}`);
  }

  const html = await profileRes.text();

  // Extract data from embedded JSON in HTML
  const totalSolvedMatch = html.match(/\"totalSolved\":(\d+)/);
  const totalQuestionsMatch = html.match(/\"totalQuestions\":(\d+)/);
  const easySolvedMatch = html.match(/\"easySolved\":(\d+)/);
  const mediumSolvedMatch = html.match(/\"mediumSolved\":(\d+)/);
  const hardSolvedMatch = html.match(/\"hardSolved\":(\d+)/);
  const submissionNumMatch = html.match(/\"submissionNum\":(\d+)/);
  const realNameMatch = html.match(/\"realName\":\"([^\"]*)\"/);
  const avatarMatch = html.match(/\"avatar\":\"([^\"]*)\"/);

  const totalSolved = totalSolvedMatch ? parseInt(totalSolvedMatch[1]) : 0;
  const totalQuestions = totalQuestionsMatch ? parseInt(totalQuestionsMatch[1]) : 0;

  return {
    username,
    realName: realNameMatch ? realNameMatch[1] : undefined,
    avatar: avatarMatch ? avatarMatch[1] : undefined,
    totalSolved,
    totalQuestions,
    easySolved: easySolvedMatch ? parseInt(easySolvedMatch[1]) : 0,
    mediumSolved: mediumSolvedMatch ? parseInt(mediumSolvedMatch[1]) : 0,
    hardSolved: hardSolvedMatch ? parseInt(hardSolvedMatch[1]) : 0,
    streak: 0,
    points: submissionNumMatch ? parseInt(submissionNumMatch[1]) : 0,
    submissionNum: submissionNumMatch ? parseInt(submissionNumMatch[1]) : 0,
    calendar: {},
  };
}

function calculateStreak(calendar: Record<string, number>): number {
  const dates = Object.keys(calendar)
    .map(Number)
    .sort((a, b) => a - b);

  if (dates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = Math.floor(today.getTime() / 1000);

  const hasToday = calendar[todayTs] && calendar[todayTs] > 0;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTs = Math.floor(yesterday.getTime() / 1000);
  const hasYesterday = calendar[yesterdayTs] && calendar[yesterdayTs] > 0;

  if (!hasToday && !hasYesterday) return 0;

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