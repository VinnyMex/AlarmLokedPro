import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { authApi } from '@/services/auth';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await authApi.login({ email, password });
      } else {
        await authApi.register({
          name,
          email,
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
        });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: spacing.lg,
        background: colors.background,
      }}
    >
      <h1 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }}>AlarmLock Premium</h1>
      <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
        Wake up. Prove it. Keep your streak.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {mode === 'register' && (
          <input
            style={inputStyle}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          style={inputStyle}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={inputStyle}
          placeholder="Password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <span style={{ color: colors.accent, fontSize: 13 }}>{error}</span>}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <button
        onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}
        style={{ background: 'none', border: 'none', color: colors.primaryAlt, marginTop: spacing.md, cursor: 'pointer' }}
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: spacing.md,
  color: colors.textPrimary,
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  background: colors.primary,
  border: 'none',
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textPrimary,
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  marginTop: spacing.sm,
};
