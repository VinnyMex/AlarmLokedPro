import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { alarmsApi } from '@/services/alarms';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

function defaultTimeInputValue(date: Date) {
  return date.toTimeString().slice(0, 5);
}

export default function CreateAlarmScreen() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Wake up');
  const [time, setTime] = useState(defaultTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [challengeMode, setChallengeMode] = useState(true);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('EASY');
  const [saving, setSaving] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledAt = new Date();
      scheduledAt.setHours(hours, minutes, 0, 0);
      if (scheduledAt.getTime() < Date.now()) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      await alarmsApi.create({
        title,
        scheduledAt: scheduledAt.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        soundId: 'default',
        challengeMode,
        challengeDifficulty: difficulty,
      });
      navigate('/');
    } catch (error) {
      console.warn('Failed to create alarm', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ padding: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      <label style={labelStyle}>Title</label>
      <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label style={labelStyle}>Time</label>
      <input style={inputStyle} type="time" value={time} onChange={(e) => setTime(e.target.value)} required />

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
        <label style={labelStyle}>Camera challenge</label>
        <button
          type="button"
          onClick={() => setChallengeMode((prev) => !prev)}
          style={{ ...pillStyle, background: challengeMode ? colors.primary : colors.surfaceAlt }}
        >
          {challengeMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {challengeMode && (
        <>
          <label style={labelStyle}>Difficulty</label>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            {DIFFICULTIES.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setDifficulty(option)}
                style={{ ...pillStyle, background: difficulty === option ? colors.primary : colors.surfaceAlt }}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      <button type="submit" disabled={saving} style={saveButtonStyle}>
        {saving ? 'Saving…' : 'Save alarm'}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 13 };
const inputStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: spacing.md,
  color: colors.textPrimary,
  fontSize: 16,
};
const pillStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: `${spacing.sm}px ${spacing.md}px`,
  color: colors.textPrimary,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
const saveButtonStyle: React.CSSProperties = {
  marginTop: spacing.xl,
  background: colors.primary,
  border: 'none',
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textPrimary,
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
};
