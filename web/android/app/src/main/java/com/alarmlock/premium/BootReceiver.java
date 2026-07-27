package com.alarmlock.premium;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import java.util.List;

/**
 * AlarmManager forgets every registered alarm on reboot — this re-registers
 * whatever's still in AlarmStore (dropping anything whose time already
 * passed while the device was off).
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        try {
            long now = System.currentTimeMillis();
            List<AlarmStore.StoredAlarm> alarms = AlarmStore.loadAll(context);
            for (AlarmStore.StoredAlarm alarm : alarms) {
                if (alarm.triggerAt <= now) {
                    AlarmStore.remove(context, alarm.id);
                    continue;
                }
                AlarmSchedulerPlugin.registerWithAlarmManager(context, alarm);
            }
        } catch (Exception e) {
            // Losing a reschedule on boot is recoverable (the app can
            // re-sync alarms next time it opens); crashing the receiver
            // is not.
        }
    }
}
