import React from 'react';
import { colors, spacing } from '@/theme/colors';
import { Alarm } from '@/types';

interface Props {
  alarm: Alarm;
  onToggle: (alarm: Alarm) => void;
  onOpen: (alarm: Alarm) => void;
}

export default function AlarmCard({ alarm, onToggle, onOpen }: Props) {
  const time = new Date(alarm.scheduledAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: colors.surface,
        borderRadius: 16,
        padding: spacing.md,
        margin: `0 ${spacing.md}px ${spacing.sm}px`,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
      }}
      onClick={() => onOpen(alarm)}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: colors.textPrimary, fontSize: 28, fontWeight: 700 }}>{time}</div>
        <div style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>{alarm.title}</div>
        <div style={{ color: colors.primaryAlt, fontSize: 12, marginTop: 4 }}>
          {alarm.challengeMode && alarm.challenge ? `Challenge: ${alarm.challenge.itemLabel}` : 'No challenge'}
        </div>
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={alarm.status === 'ACTIVE'}
          onChange={() => onToggle(alarm)}
          style={{ width: 20, height: 20, accentColor: colors.primary }}
        />
      </label>
    </div>
  );
}
