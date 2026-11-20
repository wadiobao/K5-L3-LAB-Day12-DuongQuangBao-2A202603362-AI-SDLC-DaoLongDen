import { describe, it, expect } from 'vitest';
import {
  addLeaderboardEntry,
  formatIsoWithTimezone,
  validatePlayerName
} from '../../src/core/leaderboard.js';

describe('Local Leaderboard (Ticket-04)', () => {
  it('should validate names 3-12 chars including Vietnamese accents and reject invalid chars', () => {
    expect(validatePlayerName('May_01').valid).toBe(true);
    expect(validatePlayerName('Bảo_Đèn').valid).toBe(true);
    expect(validatePlayerName('ab').valid).toBe(false);
    expect(validatePlayerName('toolongplayername123').valid).toBe(false);
    expect(validatePlayerName('bad name!').valid).toBe(false);
  });

  it('should sort by score descending, break ties by earlier achieved_at, and keep top 10', () => {
    let list = addLeaderboardEntry([], {
      name: 'LateTie',
      score: 1000,
      nights_won: 3,
      achieved_at: '2026-11-20T17:05:00+07:00',
      seed: 1
    });
    list = addLeaderboardEntry(list, {
      name: 'EarlyTie',
      score: 1000,
      nights_won: 3,
      achieved_at: '2026-11-20T17:00:00+07:00',
      seed: 2
    });
    for (let i = 0; i < 12; i++) {
      list = addLeaderboardEntry(list, {
        name: `P_${i}`,
        score: 200 + i * 50,
        nights_won: 1,
        achieved_at: `2026-11-20T16:${String(i).padStart(2, '0')}:00+07:00`,
        seed: 10 + i
      });
    }

    expect(list.length).toBe(10);
    expect(list[0].name).toBe('EarlyTie');
    expect(list[1].name).toBe('LateTie');
  });

  it('should format ISO-8601 timestamp with timezone offset', () => {
    const iso = formatIsoWithTimezone(new Date('2026-11-20T10:00:00Z'));
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});
