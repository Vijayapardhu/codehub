/**
 * HackerRank API client.
 * Uses HackerRank public API with HTML scraping fallback.
 */

export interface HackerRankProfileData {
  username: string;
  avatar?: string;
  totalSolved: number;
  badges: number;
  level: string;
  skills: { name: string; score: number }[];
}

const HACKERRANK_API_URL = "https://www.hackerrank.com";

export async function fetchHackerRankProfile(
  username: string
): Promise<HackerRankProfileData> {
  // Method 1: Try HackerRank API
  try {
    const res = await fetch(
      `${HACKERRANK_API_URL}/rest/users/${username}/scores`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; vijayaapardhu.dev)",
          "Accept": "application/json",
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

        // Fetch user info for avatar
        let avatar: string | undefined;
        try {
          const infoRes = await fetch(
            `${HACKERRANK_API_URL}/rest/users/${username}`,
            {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; vijayaapardhu.dev)",
                "Accept": "application/json",
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
          username,
          avatar,
          totalSolved,
          badges,
          level,
          skills,
        };
      }
    }
  } catch {
    // API failed, fall through to HTML scraping
  }

  // Method 2: Scrape HackerRank profile page HTML
  try {
    const profileRes = await fetch(
      `https://www.hackerrank.com/${username}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.hackerrank.com/",
          "Connection": "keep-alive",
        },
      }
    );

    if (profileRes.ok) {
      const html = await profileRes.text();

      // Extract stars/solved count from HTML
      const starsMatch = html.match(/(\d+)\s*★/i);
      const badgesMatch = html.match(/(\d+)\s*badge/i);

      return {
        username,
        avatar: undefined,
        totalSolved: starsMatch ? parseInt(starsMatch[1]) : 0,
        badges: badgesMatch ? parseInt(badgesMatch[1]) : 0,
        level: "0",
        skills: [],
      };
    }
  } catch {
    // HTML scraping failed too
  }

  throw new Error(
    `HackerRank user "${username}" not found. Please verify your HackerRank username.`
  );
}