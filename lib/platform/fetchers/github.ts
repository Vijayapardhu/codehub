/**
 * GitHub API client.
 * Tracks coding activity: commits, repositories, stars, forks, streaks.
 */

export interface GitHubProfileData {
  username: string;
  avatar: string;
  name?: string;
  followers: number;
  following: number;
  publicRepos: number;
  totalCommits: number;
  totalStars: number;
  totalForks: number;
  streak: number;
  contributions: Record<string, number>;
  recentRepos: { name: string; stars: number; forks: number; language?: string }[];
}

const GITHUB_API_URL = "https://api.github.com";

async function fetchGitHubWithAuth(
  url: string,
  headers: Record<string, string>
): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }
  return res.json();
}

export async function fetchGitHubProfile(
  username: string
): Promise<GitHubProfileData> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; vijayaapardhu.dev)",
      "Accept": "application/vnd.github.v3+json",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch user info
    const user = await fetchGitHubWithAuth(
      `${GITHUB_API_URL}/users/${username}`,
      headers
    );

    // Fetch all events (paginate to get all commits)
    let totalCommits = 0;
    const contributions: Record<string, number> = {};
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages && page <= 10) {
      // Limit to 10 pages to avoid rate limits
      const eventsRes = await fetch(
        `${GITHUB_API_URL}/users/${username}/events?per_page=100&page=${page}`,
        { headers }
      );

      if (!eventsRes.ok) break;

      const events = await eventsRes.json();
      if (events.length === 0) break;

      for (const event of events) {
        if (event.type === "PushEvent" && event.payload?.commits) {
          totalCommits += event.payload.commits.length;
          const date = new Date(event.created_at)
            .toISOString()
            .slice(0, 10);
          contributions[date] =
            (contributions[date] || 0) + event.payload.commits.length;
        }
      }

      // Check if there are more pages via Link header
      const linkHeader = eventsRes.headers.get("Link");
      hasMorePages = Boolean(linkHeader && linkHeader.includes('rel="next"'));
      page++;
    }

    // Fetch repositories to get stars and forks
    let totalStars = 0;
    let totalForks = 0;
    const recentRepos: {
      name: string;
      stars: number;
      forks: number;
      language?: string;
    }[] = [];

    try {
      const reposRes = await fetch(
        `${GITHUB_API_URL}/users/${username}/repos?per_page=100&sort=updated`,
        { headers }
      );

      if (reposRes.ok) {
        const repos = await reposRes.json();
        for (const repo of repos) {
          totalStars += repo.stargazers_count || 0;
          totalForks += repo.forks_count || 0;
          recentRepos.push({
            name: repo.name,
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            language: repo.language || undefined,
          });
        }
      }
    } catch {
      // Repos fetch failed, continue with available data
    }

    // Calculate streak from contributions
    const streak = calculateStreak(contributions);

    return {
      username: user.login,
      avatar: user.avatar_url,
      name: user.name || undefined,
      followers: user.followers || 0,
      following: user.following || 0,
      publicRepos: user.public_repos || 0,
      totalCommits,
      totalStars,
      totalForks,
      streak,
      contributions,
      recentRepos: recentRepos.slice(0, 10),
    };
  } catch (error: any) {
    throw new Error(`GitHub fetch failed: ${error.message}`);
  }
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

  if (!contributions[todayStr] && !contributions[yesterdayStr]) {
    return 0;
  }

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