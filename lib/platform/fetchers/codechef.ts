/**
 * CodeChef API client.
 * Uses CodeChef public API with HTML scraping fallback.
 */

export interface CodeChefProfileData {
  username: string;
  realName?: string;
  avatar?: string;
  totalSolved: number;
  rating: number;
  stars: number;
  rank: string;
  problemsSolved: number;
}

const CODECHEF_API_URL = "https://api.codechef.com/users";

export async function fetchCodeChefProfile(
  username: string
): Promise<CodeChefProfileData> {
  // Method 1: Try CodeChef API
  try {
    const res = await fetch(`${CODECHEF_API_URL}/${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; vijayaapardhu.dev)",
      },
    });

    if (res.ok) {
      const data = await res.json();

      if (data.status === "OK" && data.result) {
        const result = data.result;
        return {
          username: result.username,
          realName: result.name || undefined,
          avatar: result.avatar || undefined,
          totalSolved: result.problemsSolved || 0,
          rating: result.rating || 0,
          stars: result.stars || 0,
          rank: result.rank || "0",
          problemsSolved: result.problemsSolved || 0,
        };
      }
    }
  } catch {
    // API failed, fall through to HTML scraping
  }

  // Method 2: Scrape CodeChef profile page HTML
  try {
    const profileRes = await fetch(`https://www.codechef.com/users/${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.codechef.com/",
        "Connection": "keep-alive",
      },
    });

    if (profileRes.ok) {
      const html = await profileRes.text();

      // Extract problems solved from HTML
      const problemsSolvedMatch = html.match(/(\d+)\s*problems?\s*solved/i);
      const ratingMatch = html.match(/rating[:\s]*(\d+)/i);
      const starsMatch = html.match(/(\d+)\s*★/i);

      return {
        username,
        realName: undefined,
        avatar: undefined,
        totalSolved: problemsSolvedMatch ? parseInt(problemsSolvedMatch[1]) : 0,
        rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
        stars: starsMatch ? parseInt(starsMatch[1]) : 0,
        rank: "0",
        problemsSolved: problemsSolvedMatch ? parseInt(problemsSolvedMatch[1]) : 0,
      };
    }
  } catch {
    // HTML scraping failed too
  }

  throw new Error(
    `CodeChef user "${username}" not found. Please verify your CodeChef username.`
  );
}