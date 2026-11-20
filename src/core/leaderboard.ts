/**
 * @file leaderboard.ts
 * @description Local top-10 leaderboard validation, ISO-8601 timezone formatting, and sorting rules (Ticket-04).
 */

export interface LeaderboardEntry {
  name: string;
  score: number;
  nights_won: number;
  achieved_at: string;
  seed: number;
}

export interface LeaderboardFile {
  entries: LeaderboardEntry[];
}

/**
 * Validates player name: 3–12 chars of letters (including Vietnamese accents), digits, or underscore.
 */
export function validatePlayerName(raw: string): { valid: boolean; cleaned: string; reason?: string } {
  const cleaned = raw.trim();
  if (cleaned.length < 3 || cleaned.length > 12) {
    return { valid: false, cleaned, reason: 'Tên phải dài từ 3 đến 12 ký tự.' };
  }
  if (!/^[\p{L}0-9_]+$/u.test(cleaned)) {
    return { valid: false, cleaned, reason: 'Tên chỉ chứa chữ cái, chữ số hoặc dấu gạch dưới (_).' };
  }
  return { valid: true, cleaned };
}

/**
 * Formats a Date into ISO-8601 string with local timezone offset (e.g., 2026-11-20T17:00:00+07:00).
 */
export function formatIsoWithTimezone(date: Date = new Date()): string {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const hh = pad(offsetMin / 60);
  const mm = pad(offsetMin % 60);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${hh}:${mm}`
  );
}

/**
 * Sorts leaderboard entries by score descending; ties broken by earlier achieved_at timestamp.
 * Truncates to top N entries (default 10).
 */
export function sortAndTrimLeaderboard(entries: LeaderboardEntry[], maxEntries = 10): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(a.achieved_at) - Date.parse(b.achieved_at);
    })
    .slice(0, maxEntries);
}

/**
 * Inserts a new entry and returns the sorted top-10 array.
 */
export function addLeaderboardEntry(
  existing: LeaderboardEntry[],
  entry: LeaderboardEntry,
  maxEntries = 10
): LeaderboardEntry[] {
  return sortAndTrimLeaderboard([...existing, entry], maxEntries);
}
