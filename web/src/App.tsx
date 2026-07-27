import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { isAuthenticated, onAuthExpired } from '@/services/api';
import { isNativeAlarmSchedulerAvailable, nativeAlarmScheduler } from '@/services/nativeAlarmScheduler';
import AppShell from '@/navigation/AppShell';
import LoginScreen from '@/screens/LoginScreen';
import HomeScreen from '@/screens/HomeScreen';
import CreateAlarmScreen from '@/screens/CreateAlarmScreen';
import AlarmChallengeScreen from '@/screens/AlarmChallengeScreen';
import GamificationScreen from '@/screens/GamificationScreen';
import ShareScreen from '@/screens/ShareScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import BillingScreen from '@/screens/BillingScreen';

function RequireAuth({ children }: { children: React.ReactElement }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

/**
 * Bridges the native Android alarm hand-off into React Router: when
 * AlarmReceiver fires (see android/.../AlarmReceiver.java), it stashes the
 * firing alarm's id for the web app to pick up rather than pushing a route
 * directly — the native side has no notion of the SPA's routes. This reads
 * that id on cold start and every time the app resumes to the foreground,
 * and navigates to the challenge screen. No-op outside the Capacitor
 * Android shell (isNativeAlarmSchedulerAvailable() is false there).
 */
function PendingAlarmHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeAlarmSchedulerAvailable()) return;

    let cancelled = false;
    const checkPending = async () => {
      const { alarmId } = await nativeAlarmScheduler.consumePendingAlarmId();
      if (alarmId && !cancelled) navigate(`/challenge/${alarmId}`);
    };

    checkPending();
    const listenerPromise = CapacitorApp.addListener('resume', checkPending);

    return () => {
      cancelled = true;
      listenerPromise.then((handle) => handle.remove());
    };
  }, [navigate]);

  return null;
}

/**
 * Access tokens are short-lived; api.ts transparently refreshes them on a
 * 401 and only fires 'alarmlock:auth-expired' when the refresh token itself
 * is gone/invalid — that's the one case that should actually bounce the
 * user back to login rather than just retrying quietly.
 */
function AuthExpiredHandler() {
  const navigate = useNavigate();

  useEffect(() => onAuthExpired(() => navigate('/login', { replace: true })), [navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PendingAlarmHandler />
      <AuthExpiredHandler />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/challenge/:alarmId"
          element={
            <RequireAuth>
              <AlarmChallengeScreen />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<HomeScreen />} />
          <Route path="/alarms/new" element={<CreateAlarmScreen />} />
          <Route path="/progress" element={<GamificationScreen />} />
          <Route path="/share" element={<ShareScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/billing" element={<BillingScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
