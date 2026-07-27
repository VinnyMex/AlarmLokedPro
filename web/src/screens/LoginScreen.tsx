import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { authApi } from '@/services/auth';
import {
  isGoogleSignInConfigured,
  isNativeGoogleSignInAvailable,
  renderGoogleSignInButton,
  signInWithGoogleNative,
} from '@/services/googleAuth';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleIdToken = async (idToken: string) => {
    setError(null);
    setLoading(true);
    try {
      await authApi.loginWithGoogle(idToken);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Web/PWA: render Google's own button and resolve once the user completes
  // the flow. Native Android renders a matching custom button instead (see
  // below) since Google blocks the web flow inside an embedded WebView.
  useEffect(() => {
    if (isNativeGoogleSignInAvailable() || !isGoogleSignInConfigured() || !googleButtonRef.current) return;
    let cancelled = false;
    renderGoogleSignInButton(googleButtonRef.current)
      .then((idToken) => {
        if (!cancelled) handleGoogleIdToken(idToken);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNativeGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const idToken = await signInWithGoogleNative();
      await handleGoogleIdToken(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

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

      {isGoogleSignInConfigured() && (
        <div style={{ marginBottom: spacing.md, display: 'flex', justifyContent: 'center' }}>
          {isNativeGoogleSignInAvailable() ? (
            <button type="button" onClick={handleNativeGoogleSignIn} disabled={loading} style={googleButtonStyle}>
              Continue with Google
            </button>
          ) : (
            <div ref={googleButtonRef} />
          )}
        </div>
      )}

      {isGoogleSignInConfigured() && (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, margin: `0 0 ${spacing.md}px` }}>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
          <span style={{ color: colors.textSecondary, fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>
      )}

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

const googleButtonStyle: React.CSSProperties = {
  background: '#131314',
  border: '1px solid #8e918f',
  borderRadius: 999,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  color: '#e3e3e3',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
};
