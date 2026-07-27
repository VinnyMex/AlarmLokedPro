export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AlarmChallenge {
  id: string;
  itemType: string;
  itemLabel: string;
  skipPrice: number;
  validationTimeoutSeconds: number;
  confidenceThreshold: number;
}

export interface Alarm {
  id: string;
  title: string;
  scheduledAt: string;
  repeatPattern: string;
  timezone: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
  soundId: string;
  snoozeEnabled: boolean;
  snoozeMinutes: number;
  challengeMode: boolean;
  challengeDifficulty: ChallengeDifficulty;
  challenge?: AlarmChallenge | null;
}

export interface UserProgress {
  xpTotal: number;
  level: number;
  consecutiveCompletions: number;
  totalCompletions: number;
  totalSkips: number;
  freeSkipBalance: number;
  freeSkipExpiresAt: string | null;
  bestStreak: number;
}

export interface RankingEntry {
  userId: string;
  xpScore: number;
  rankPosition: number;
  user: { id: string; name: string };
}

export interface UserSettings {
  enableLocationShare: boolean;
  enableWeatherShare: boolean;
  enableTimeShare: boolean;
  enableWatermark: boolean;
  vibrationEnabled: boolean;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  settings: UserSettings;
}
