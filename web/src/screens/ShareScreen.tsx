import React, { useState } from 'react';
import { colors, spacing } from '@/theme/colors';
import { sharesApi } from '@/services/progress';

const TEMPLATES = ['streak_gold', 'level_up', 'ranking_top10'];

export default function ShareScreen() {
  const [templateCode, setTemplateCode] = useState(TEMPLATES[0]);
  const [includeWeather, setIncludeWeather] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [watermarkText, setWatermarkText] = useState('AlarmLock Premium');
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setStatus('Rendering…');
    try {
      await sharesApi.render({ templateCode, includeWeather, includeLocation, includeTime, watermarkText });
      setStatus('Ready — check your share history.');
    } catch (error) {
      setStatus('Could not render the share image. Try again.');
    }
  };

  return (
    <div style={{ padding: spacing.md }}>
      <div
        style={{
          background: colors.surface,
          borderRadius: 16,
          padding: spacing.lg,
          minHeight: 200,
          border: `1px solid ${colors.border}`,
          marginBottom: spacing.md,
        }}
      >
        <div style={{ color: colors.textSecondary, fontSize: 12 }}>Preview</div>
        <div style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700, margin: `${spacing.xs}px 0` }}>
          Template: {templateCode}
        </div>
        {includeTime && <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>🕒 Woke up on time</div>}
        {includeWeather && <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>☀️ Sunny, 22°C</div>}
        {includeLocation && <div style={{ color: colors.textSecondary, marginTop: spacing.xs }}>📍 São Paulo, BR</div>}
        <div style={{ color: colors.primaryAlt, marginTop: spacing.md, fontSize: 12 }}>{watermarkText}</div>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
        {TEMPLATES.map((code) => (
          <button
            key={code}
            onClick={() => setTemplateCode(code)}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: `${spacing.sm}px ${spacing.md}px`,
              background: templateCode === code ? colors.primary : colors.surfaceAlt,
              color: colors.textPrimary,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {code}
          </button>
        ))}
      </div>

      <ToggleRow label="Include time" value={includeTime} onChange={setIncludeTime} />
      <ToggleRow label="Include weather (opt-in)" value={includeWeather} onChange={setIncludeWeather} />
      <ToggleRow label="Include location (opt-in)" value={includeLocation} onChange={setIncludeLocation} />

      <label style={{ color: colors.textSecondary, fontSize: 13, marginTop: spacing.md, display: 'block' }}>
        Watermark
      </label>
      <input
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: spacing.md,
          color: colors.textPrimary,
          width: '100%',
          marginTop: spacing.xs,
        }}
        value={watermarkText}
        onChange={(e) => setWatermarkText(e.target.value)}
      />

      <button
        onClick={handleExport}
        style={{
          marginTop: spacing.lg,
          background: colors.primary,
          border: 'none',
          borderRadius: 999,
          padding: spacing.md,
          color: colors.textPrimary,
          fontWeight: 700,
          width: '100%',
          cursor: 'pointer',
        }}
      >
        Export
      </button>
      {status && <p style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>{status}</p>}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${spacing.sm}px 0`, cursor: 'pointer' }}
    >
      <span style={{ color: colors.textPrimary }}>{label}</span>
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
