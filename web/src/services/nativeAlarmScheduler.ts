import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AlarmSchedulerPlugin {
  schedule(options: { id: string; title: string; body: string; triggerAt: number }): Promise<void>;
  cancel(options: { id: string }): Promise<void>;
  cancelAll(): Promise<void>;
  consumePendingAlarmId(): Promise<{ alarmId: string | null }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  checkFullScreenIntentPermission(): Promise<{ allowed: boolean }>;
  openFullScreenIntentSettings(): Promise<void>;
}

// Native side lives at web/android/app/src/main/java/com/alarmlock/premium/
// AlarmSchedulerPlugin.java. Only registered/functional inside the Capacitor
// Android shell — on plain web there is no native implementation, so every
// call site here must check isNativeAlarmSchedulerAvailable() first (see
// alarmScheduler.ts, which falls back to the in-page setTimeout scheduler
// otherwise).
export const nativeAlarmScheduler = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler');

export function isNativeAlarmSchedulerAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}
