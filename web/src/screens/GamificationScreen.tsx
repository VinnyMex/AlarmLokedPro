import React, { useCallback, useEffect, useState } from 'react';
import { colors, spacing } from '@/theme/colors';
import { progressApi, rankingsApi } from '@/services/progress';
import { xpRequiredForLevel } from '@/services/levels';
import { RankingEntry, UserProgress } from '@/types';

const BADGE_MILESTONES = [5, 10, 25, 50, 100];

export default function GamificationScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const load = useCallback(async () => {
    const [userProgress, rankingResult] = await Promise.all([progressApi.get(), rankingsApi.list(period)]);
    setProgress(userProgress);
    setRanking(rankingResult.entries);
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const xpForLevel = progress ? xpRequiredForLevel(progress.level) : 100;
  const xpRatio = progress ? Math.min(1, (progress.xpTotal % xpForLevel) / xpForLevel) : 0;

  return (
    <div style={{ padding: spacing.md }}>
      <div style={{ background: colors.surface, borderRadius: 16, padding: spacing.md, border: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.textPrimary, fontSize: 24, fontWeight: 800 }}>Level {progress?.level ?? 1}</div>
        <div style={{ height: 10, borderRadius: 5, background: colors.surfaceAlt, margin: `${spacing.sm}px 0`, overflow: 'hidden' }}>
          <div style={{ height: 10, width: `${xpRatio * 100}%`, background: colors.primary }} />
        </div>
        <div style={{ color: colors.textSecondary, fontSize: 12 }}>
          {progress?.xpTotal ?? 0} XP · next level at {xpForLevel} XP into this level
        </div>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, margin: `${spacing.md}px 0` }}>
        {BADGE_MILESTONES.map((milestone) => {
          const achieved = (progress?.totalCompletions ?? 0) >= milestone;
          return (
            <div
              key={milestone}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: achieved ? colors.warning : colors.surfaceAlt,
                border: `1px solid ${achieved ? colors.warning : colors.border}`,
                color: colors.textPrimary,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {milestone}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        {(['weekly', 'monthly'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setPeriod(option)}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: `${spacing.sm}px ${spacing.md}px`,
              background: period === option ? colors.primary : colors.surfaceAlt,
              color: colors.textPrimary,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {option}
          </button>
        ))}
      </div>

      {ranking.length === 0 && <p style={{ color: colors.textSecondary }}>No ranking data yet.</p>}
      {ranking.map((entry) => (
        <div
          key={entry.userId}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `${spacing.sm}px 0`,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ color: colors.primaryAlt, width: 40, fontWeight: 700 }}>#{entry.rankPosition}</span>
          <span style={{ color: colors.textPrimary, flex: 1 }}>{entry.user.name}</span>
          <span style={{ color: colors.textSecondary }}>{entry.xpScore} XP</span>
        </div>
      ))}
    </div>
  );
}
