import { ChallengeDifficulty } from '@prisma/client';

interface DifficultyPreset {
  confidenceThreshold: number;
  validationTimeoutSeconds: number;
}

// PRD section 6.4 — difficulty tunes threshold and attempt window.
export const DIFFICULTY_PRESETS: Record<ChallengeDifficulty, DifficultyPreset> = {
  EASY: { confidenceThreshold: 0.7, validationTimeoutSeconds: 90 },
  MEDIUM: { confidenceThreshold: 0.8, validationTimeoutSeconds: 60 },
  HARD: { confidenceThreshold: 0.9, validationTimeoutSeconds: 30 },
};

export const SKIP_PRICE_USD = 0.99;
