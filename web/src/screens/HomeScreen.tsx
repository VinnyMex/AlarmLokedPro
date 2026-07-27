import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { alarmsApi } from '@/services/alarms';
import { progressApi } from '@/services/progress';
import { Alarm, UserProgress } from '@/types';
import AlarmCard from '@/components/AlarmCard';
import StreakXpCard from '@/components/StreakXpCard';
import { alarmScheduler } from '@/services/alarmScheduler';
import { TAB_BAR_HEIGHT_CSS } from '@/navigation/AppShell';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const load = useCallback(async () => {
    try {
      const [alarmList, userProgress] = await Promise.all([alarmsApi.list(), progressApi.get()]);
      setAlarms(alarmList);
      setProgress(userProgress);
    } catch (error) {
      console.warn('Failed to load home data', error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    alarms.forEach((alarm) => {
      alarmScheduler.schedule(alarm, (fired) => navigate(`/challenge/${fired.id}`));
    });
    return () => alarmScheduler.cancelAll();
  }, [alarms, navigate]);

  const handleToggle = async (alarm: Alarm) => {
    const nextStatus = alarm.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await alarmsApi.update(alarm.id, { status: nextStatus });
    setAlarms((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <StreakXpCard progress={progress} />
      <div style={{ paddingTop: spacing.md }}>
        {alarms.length === 0 && (
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
            No alarms yet. Create one to start your streak.
          </p>
        )}
        {alarms.map((alarm) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            onToggle={handleToggle}
            onOpen={(item) => navigate(`/challenge/${item.id}`)}
          />
        ))}
      </div>
      <button
        onClick={() => navigate('/alarms/new')}
        style={{
          position: 'fixed',
          bottom: `calc(${TAB_BAR_HEIGHT_CSS} + ${spacing.sm}px)`,
          left: spacing.md,
          right: spacing.md,
          minHeight: 48,
          background: colors.primary,
          border: 'none',
          borderRadius: 999,
          padding: spacing.md,
          color: colors.textPrimary,
          fontWeight: 700,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        + Create alarm
      </button>
    </div>
  );
}
