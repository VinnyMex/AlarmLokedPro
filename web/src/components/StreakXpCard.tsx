import React from 'react';
import { colors, spacing } from '@/theme/colors';
import { UserProgress } from '@/types';
import { xpRequiredForLevel } from '@/services/levels';

export default function StreakXpCard({ progress }: { progress: UserProgress | null }) {
  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    margin: `${spacing.md}px`,
    border: `1px solid ${colors.border}`,
  };

  if (!progress) {
    return (
      <div style={cardStyle}>
        <span style={{ color: colors.textSecondary }}>Loading progress…</span>
      </div>
    );
  }

  const xpForLevel = xpRequiredForLevel(progress.level);
  const xpProgressRatio = Math.min(1, (progress.xpTotal % xpForLevel) / xpForLevel);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Stat label="Level" value={String(progress.level)} />
        <Stat label="Streak" value={`${progress.consecutiveCompletions} 🔥`} />
        <Stat label="Free skips" value={String(progress.freeSkipBalance)} />
      </div>
      <div style={{ height: 8, borderRadius: 4, background: colors.surfaceAlt, overflow: 'hidden' }}>
        <div style={{ height: 8, width: `${xpProgressRatio * 100}%`, background: colors.primary }} />
      </div>
      <div style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs }}>
        {progress.xpTotal} XP total · best streak {progress.bestStreak}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</div>
      <div style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}
