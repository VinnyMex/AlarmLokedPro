import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from '@/services/api';
import AppShell from '@/navigation/AppShell';
import LoginScreen from '@/screens/LoginScreen';
import HomeScreen from '@/screens/HomeScreen';
import CreateAlarmScreen from '@/screens/CreateAlarmScreen';
import AlarmChallengeScreen from '@/screens/AlarmChallengeScreen';
import GamificationScreen from '@/screens/GamificationScreen';
import ShareScreen from '@/screens/ShareScreen';
import SettingsScreen from '@/screens/SettingsScreen';

function RequireAuth({ children }: { children: React.ReactElement }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
