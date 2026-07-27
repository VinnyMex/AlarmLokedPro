import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { apiRequest } from '@/services/api';
import { authApi } from '@/services/auth';
import { Me, UserSettings } from '@/types';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    apiRequest<Me>('/me')
      .then((me) => setSettings(me.settings))
      .catch((error) => console.warn('Failed to load settings', error));
  }, []);

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
