import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';

const TABS = [
  { to: '/', label: 'Alarms', icon: '⏰' },
  { to: '/progress', label: 'Progress', icon: '🏆' },
  { to: '/share', label: 'Share', icon: '📤' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.background }}>
      <main style={{ flex: 1, paddingBottom: 72 }}>
        <Outlet />
      </main>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          background: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            style={({ isActive }) => ({
              flex: 1,
              textAlign: 'center',
              padding: `${spacing.sm}px 0`,
              textDecoration: 'none',
              color: isActive ? colors.primary : colors.textSecondary,
              fontSize: 12,
            })}
          >
            <div style={{ fontSize: 20 }}>{tab.icon}</div>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
