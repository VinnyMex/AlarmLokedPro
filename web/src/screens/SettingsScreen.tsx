import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { apiRequest } from '@/services/api';
import { authApi } from '@/services/auth';
import { Me, UserSettings } from '@/types';
import { AlarmDiagnostics, isNativeAlarmSchedulerAvailable, nativeAlarmScheduler } from '@/services/nativeAlarmScheduler';
import { requestNotificationPermission } from '@/services/alarmScheduler';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);
  const [fullScreenAllowed, setFullScreenAllowed] = useState<boolean | null>(null);
  const [diagnostics, setDiagnostics] = useState<AlarmDiagnostics | null>(null);

  const loadDiagnostics = () => {
    if (!isNativeAlarmSchedulerAvailable()) return;
    nativeAlarmScheduler.getDiagnostics().then(setDiagnostics).catch((err) => console.warn('Diagnostics failed', err));
  };

  useEffect(() => {
    apiRequest<Me>('/me')
      .then((me) => setSettings(me.settings))
      .catch((error) => console.warn('Failed to load settings', error));

    if (isNativeAlarmSchedulerAvailable()) {
      nativeAlarmScheduler.checkFullScreenIntentPermission().then((r) => setFullScreenAllowed(r.allowed));
      loadDiagnostics();
    }
  }, []);

  const handleRequestNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotificationsGranted(result === 'granted');
    loadDiagnostics();
  };

  const updateSetting = async (patch: Partial<UserSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    await apiRequest('/me/settings', { method: 'PATCH', body: patch });
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('This permanently deletes your personal data in line with LGPD. This cannot be undone.')) {
      return;
    }
    await apiRequest('/me/account', { method: 'DELETE' });
    authApi.logout();
    navigate('/login', { replace: true });
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/login', { replace: true });
  };

  if (!settings) {
    return <p style={{ color: colors.textSecondary, padding: spacing.md }}>Loading settings…</p>;
  }

  return (
    <div style={{ padding: spacing.md }}>
      <SectionTitle>Subscription</SectionTitle>
      <button onClick={() => navigate('/billing')} style={secondaryButtonStyle}>
        Manage subscription &amp; billing
      </button>

      {isNativeAlarmSchedulerAvailable() && (
        <>
          <SectionTitle>Alarm permissions (Android)</SectionTitle>
          <p style={{ color: colors.textSecondary, fontSize: 12, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
            Both of these are required for alarms to actually take over the screen when they fire.
          </p>
          <button onClick={handleRequestNotifications} style={secondaryButtonStyle}>
            {notificationsGranted === false ? 'Notification permission denied — open Settings' : 'Allow notifications'}
          </button>
          {fullScreenAllowed === false && (
            <button
              onClick={() => nativeAlarmScheduler.openFullScreenIntentSettings()}
              style={secondaryButtonStyle}
            >
              Allow full-screen alarms (required on Android 14+)
            </button>
          )}
          {diagnostics?.ignoringBatteryOptimizations === false && (
            <button
              onClick={() => nativeAlarmScheduler.requestIgnoreBatteryOptimizations()}
              style={secondaryButtonStyle}
            >
              Disable battery optimization for AlarmLock
            </button>
          )}

          <SectionTitle>Alarm diagnostics</SectionTitle>
          <p style={{ color: colors.textSecondary, fontSize: 12, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
            If an alarm isn't firing, check this after creating it — it shows
            exactly what's registered with Android, not just what the app
            thinks happened.
          </p>
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: spacing.md,
              marginBottom: spacing.sm,
              fontSize: 13,
              color: colors.textSecondary,
            }}
          >
            {diagnostics ? (
              <>
                <DiagnosticRow label="Notifications granted" value={diagnostics.notificationsGranted} />
                <DiagnosticRow label="Full-screen alarms allowed" value={diagnostics.fullScreenIntentAllowed} />
                <DiagnosticRow label="Battery optimization disabled" value={diagnostics.ignoringBatteryOptimizations} />
                <div style={{ marginTop: spacing.sm, color: colors.textPrimary, fontWeight: 600 }}>
                  Alarms registered with Android: {diagnostics.persistedAlarms.length}
                </div>
                {diagnostics.persistedAlarms.map((alarm) => (
                  <div key={alarm.id} style={{ marginTop: spacing.xs }}>
                    {alarm.title} → {new Date(alarm.triggerAt).toLocaleString()}
                  </div>
                ))}
                <div style={{ marginTop: spacing.sm }}>
                  System's next alarm-clock:{' '}
                  {diagnostics.systemNextAlarmClockTriggerAt
                    ? new Date(diagnostics.systemNextAlarmClockTriggerAt).toLocaleString()
                    : 'none'}
                </div>
              </>
            ) : (
              'Loading…'
            )}
          </div>
          <button onClick={loadDiagnostics} style={secondaryButtonStyle}>
            Refresh diagnostics
          </button>
        </>
      )}

      <SectionTitle>Privacy</SectionTitle>
      <SettingRow
        label="Share location on posts"
        description="Opt-in only. Used solely for social share images."
        value={settings.enableLocationShare}
        onChange={(value) => updateSetting({ enableLocationShare: value })}
      />
      <SettingRow
        label="Share weather on posts"
        description="Derived from location, only if location sharing is on."
        value={settings.enableWeatherShare}
        onChange={(value) => updateSetting({ enableWeatherShare: value })}
      />
      <SettingRow
        label="Watermark on shares"
        value={settings.enableWatermark}
        onChange={(value) => updateSetting({ enableWatermark: value })}
      />

      <SectionTitle>Alarm</SectionTitle>
      <SettingRow
        label="Vibration"
        value={settings.vibrationEnabled}
        onChange={(value) => updateSetting({ vibrationEnabled: value })}
      />

      <SectionTitle>Account</SectionTitle>
      <button onClick={handleLogout} style={secondaryButtonStyle}>
        Log out
      </button>
      <button onClick={handleDeleteAccount} style={dangerButtonStyle}>
        Delete my account and data
      </button>
    </div>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ color: value ? colors.success : colors.accent, fontWeight: 700 }}>{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', margin: `${spacing.lg}px 0 ${spacing.sm}px` }}>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: colors.surface,
        borderRadius: 12,
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        marginBottom: spacing.sm,
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{label}</div>
        {description && <div style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ width: 44, height: 24, borderRadius: 12, background: value ? colors.primary : colors.surfaceAlt, padding: 2 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            background: value ? colors.textPrimary : colors.textSecondary,
            marginLeft: value ? 20 : 0,
            transition: 'margin-left 0.15s',
          }}
        />
      </div>
    </div>
  );
}

const secondaryButtonStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  background: 'transparent',
  color: colors.textPrimary,
  padding: spacing.md,
  fontWeight: 600,
  cursor: 'pointer',
  marginBottom: spacing.sm,
};

const dangerButtonStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: `1px solid ${colors.accent}`,
  background: 'transparent',
  color: colors.accent,
  padding: spacing.md,
  fontWeight: 700,
  cursor: 'pointer',
};
