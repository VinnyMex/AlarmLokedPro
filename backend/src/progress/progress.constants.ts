// PRD section 8.1 — XP rules
export const XP_COMPLETION = 10;
export const XP_COMPLETION_WITHOUT_SKIP = 15;
export const XP_BONUS_STREAK_3 = 20;
export const XP_BONUS_STREAK_5 = 50;
export const XP_SHARE_ACHIEVEMENT = 5;
export const XP_FAST_VALIDATION_BONUS = 10;
export const FAST_VALIDATION_THRESHOLD_SECONDS = 10;

// PRD section 8.4 — free skip reward
export const FREE_SKIP_STREAK_INTERVAL = 5;
export const FREE_SKIP_MAX_BALANCE = 1; // non-cumulative
export const FREE_SKIP_EXPIRY_DAYS = 30;

// PRD section 8.2 — levels (1-100, linearly increasing XP curve)
export const MAX_LEVEL = 100;

/** XP required to go from `level` to `level + 1`. */
export function xpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 25;
}

/** Recomputes level from total XP using the level curve above. */
export function levelFromXp(xpTotal: number): number {
  let level = 1;
  let remaining = xpTotal;
  while (level < MAX_LEVEL && remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }
  return level;
}
