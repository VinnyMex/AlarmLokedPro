import { Alarm } from '@/types';

type FireHandler = (alarm: Alarm) => void;

const MAX_SETTIMEOUT_MS = 2_147_483_647; // setTimeout's 32-bit signed int cap (~24.8 days)

/**
 * Client-side alarm scheduler.
 *
 * IMPORTANT LIMITATION: this only fires while the AlarmLock tab/PWA window
 * is open (the browser suspends timers in background/closed tabs, and there
 * is no web API to wake a closed PWA to full-screen a locked device the way
 * a native alarm app can). It's enough to demo and dogfood the challenge
 * flow, but it is not a substitute for a native background alarm — see the
 * README's "Known gaps" section before relying on this for real wake-ups.
 */
class AlarmScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(alarm: Alarm, onFire: FireHandler) {
    this.cancel(alarm.id);
    if (alarm.status !== 'ACTIVE') return;

    const delay = new Date(alarm.scheduledAt).getTime() - Date.now();
    if (delay <= 0 || delay > MAX_SETTIMEOUT_MS) return;

    const timer = setTimeout(() => {
      this.notify(alarm);
      onFire(alarm);
    }, delay);

    this.timers.set(alarm.id, timer);
  }

  cancel(alarmId: string) {
    const timer = this.timers.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(alarmId);
    }
  }

  cancelAll() {
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
  if (!('Notification' in window)) return 'unsupported' as const;
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}
