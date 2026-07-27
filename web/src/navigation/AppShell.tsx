import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';

const TABS = [
  { to: '/', label: 'Alarms', icon: '⏰' },
  { to: '/progress', label: 'Progress', icon: '🏆' },
  { to: '/share', label: 'Share', icon: '📤' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

// Exported so screens that float content above the tab bar (e.g. Home's
// "Create alarm" button) can line up against the same value instead of a
// second hardcoded guess — the tab bar's actual height is this content
// height plus whatever the device's bottom safe-area inset is.
export const TAB_BAR_CONTENT_HEIGHT = 56;
export const TAB_BAR_HEIGHT_CSS = `calc(${TAB_BAR_CONTENT_HEIGHT}px + env(safe-area-inset-bottom))`;

export default function AppShell() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        background: colors.background,
      }}
    >
      <main style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT_CSS }}>
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
              minHeight: 44,
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
