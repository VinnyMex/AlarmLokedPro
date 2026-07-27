import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { alarmsApi } from '@/services/alarms';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

function defaultTimeInputValue(date: Date) {
  return date.toTimeString().slice(0, 5);
}

export default function CreateAlarmScreen() {
  const navigate = useNavigate();
  const { alarmId } = useParams<{ alarmId: string }>();
  const isEditing = Boolean(alarmId);

  const [title, setTitle] = useState('Wake up');
  const [time, setTime] = useState(defaultTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [challengeMode, setChallengeMode] = useState(true);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('EASY');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alarmId) return;
    alarmsApi
      .get(alarmId)
      .then((alarm) => {
        setTitle(alarm.title);
        setTime(defaultTimeInputValue(new Date(alarm.scheduledAt)));
        setChallengeMode(alarm.challengeMode);
        setDifficulty(alarm.challengeDifficulty);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load alarm'))
      .finally(() => setLoading(false));
  }, [alarmId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledAt = new Date();
      scheduledAt.setHours(hours, minutes, 0, 0);
      if (!isEditing && scheduledAt.getTime() < Date.now()) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      const payload = {
        title,
        scheduledAt: scheduledAt.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        soundId: 'default',
        challengeMode,
        challengeDifficulty: difficulty,
      };

      if (isEditing && alarmId) {
        await alarmsApi.update(alarmId, payload);
      } else {
        await alarmsApi.create(payload);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alarm');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!alarmId) return;
    if (!window.confirm('Delete this alarm? This cannot be undone.')) return;
    setDeleting(true);
    setError(null);
    try {
      await alarmsApi.remove(alarmId);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alarm');
      setDeleting(false);
    }
  };

  if (loading) {
    return <p style={{ color: colors.textSecondary, padding: spacing.md }}>Loading alarm…</p>;
  }

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

      {error && <span style={{ color: colors.accent, fontSize: 13 }}>{error}</span>}

      <button type="submit" disabled={saving || deleting} style={saveButtonStyle}>
        {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save alarm'}
      </button>

      {isEditing && alarmId && (
        <>
          <button
            type="button"
            onClick={() => navigate(`/challenge/${alarmId}`)}
            disabled={saving || deleting}
            style={secondaryButtonStyle}
          >
            Test this challenge now
          </button>
          <button type="button" onClick={handleDelete} disabled={saving || deleting} style={deleteButtonStyle}>
            {deleting ? 'Deleting…' : 'Delete alarm'}
          </button>
        </>
      )}
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
  minHeight: 44,
  color: colors.textPrimary,
  fontSize: 13,
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
const secondaryButtonStyle: React.CSSProperties = {
  marginTop: spacing.sm,
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textSecondary,
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
};
const deleteButtonStyle: React.CSSProperties = {
  marginTop: spacing.sm,
  background: 'transparent',
  border: `1px solid ${colors.accent}`,
  borderRadius: 999,
  padding: spacing.md,
  color: colors.accent,
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
};
