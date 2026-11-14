// Set NEXT_PUBLIC_SITE_URL once deployed (e.g. in Vercel project env vars)
// so metadata, the sitemap, and robots.txt all point at the real domain.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vijayaapardhu.dev";
export const SITE_NAME = "vijayaapardhu.dev";
export const SITE_DESCRIPTION =
  "Track coding interview prep across GitHub, LeetCode, CodeChef, and HackerRank — browse by company, filter by difficulty, bookmark questions, and track your solved progress with streaks.";
