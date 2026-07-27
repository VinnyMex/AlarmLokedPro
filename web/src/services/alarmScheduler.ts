import { Alarm } from '@/types';
import { isNativeAlarmSchedulerAvailable, nativeAlarmScheduler } from './nativeAlarmScheduler';

type FireHandler = (alarm: Alarm) => void;

const MAX_SETTIMEOUT_MS = 2_147_483_647; // setTimeout's 32-bit signed int cap (~24.8 days)

/**
 * Client-side alarm scheduler.
 *
 * On plain web (browser tab / installed PWA with no native shell) this only
 * fires while the AlarmLock tab is open — browsers suspend timers in
 * background/closed tabs, and there is no web API to wake a closed page to
 * full-screen a locked device. Inside the Capacitor Android shell, `schedule`
 * instead hands the alarm to AlarmManager via nativeAlarmScheduler (see
 * android/app/src/main/java/com/alarmlock/premium/AlarmSchedulerPlugin.java),
 * which survives the app being closed or the device being locked — that's
 * the whole reason the native wrapper exists. `onFire` still only fires here
 * for the web fallback path; the native path instead delivers the alarm via
 * a pending-alarm-id handoff consumed on app resume (see App.tsx).
 */
class AlarmScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private knownIds = new Set<string>();

  /**
   * Reconciles the scheduler with the current alarm list. Only cancels
   * alarms that have actually disappeared (deleted) since the last call —
   * critically, it does NOT blanket-cancel everything on every call. A
   * naive "cancel everything, then reschedule" here would wipe out native
   * AlarmManager registrations every time this ran, including just from
   * React unmounting/remounting the Home screen when navigating to another
   * tab and back — which defeats the entire point of scheduling through
   * AlarmManager instead of a JS timer in the first place.
   */
  syncSchedule(alarms: Alarm[], onFire: FireHandler) {
    const nextIds = new Set(alarms.map((alarm) => alarm.id));
    this.knownIds.forEach((id) => {
      if (!nextIds.has(id)) this.cancel(id);
    });
    this.knownIds = nextIds;
    alarms.forEach((alarm) => this.schedule(alarm, onFire));
  }

  schedule(alarm: Alarm, onFire: FireHandler) {
    this.cancel(alarm.id);
    if (alarm.status !== 'ACTIVE') return;

    const triggerAt = new Date(alarm.scheduledAt).getTime();

    if (isNativeAlarmSchedulerAvailable()) {
      nativeAlarmScheduler
        .schedule({
          id: alarm.id,
          title: 'AlarmLock',
          body: `${alarm.title} — show the requested object to silence the alarm.`,
          triggerAt,
        })
        .catch((error) => console.warn('Native alarm schedule failed', error));
      return;
    }

    const delay = triggerAt - Date.now();
    if (delay <= 0 || delay > MAX_SETTIMEOUT_MS) return;

    const timer = setTimeout(() => {
      this.notify(alarm);
      onFire(alarm);
    }, delay);

    this.timers.set(alarm.id, timer);
  }

  cancel(alarmId: string) {
    if (isNativeAlarmSchedulerAvailable()) {
      nativeAlarmScheduler.cancel({ id: alarmId }).catch((error) => console.warn('Native alarm cancel failed', error));
    }

    const timer = this.timers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(alarmId);
    }
  }

  cancelAll() {
    if (isNativeAlarmSchedulerAvailable()) {
      nativeAlarmScheduler.cancelAll().catch((error) => console.warn('Native alarm cancelAll failed', error));
    }

    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  private notify(alarm: Alarm) {
    if (Notification.permission === 'granted') {
      new Notification('AlarmLock', { body: `${alarm.title} — open the app to complete your challenge.` });
    }
  }
}

export const alarmScheduler = new AlarmScheduler();

export async function requestNotificationPermission() {
  if (isNativeAlarmSchedulerAvailable()) {
    const result = await nativeAlarmScheduler.requestNotificationPermission();
    return result.granted ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'unsupported' as const;
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}
