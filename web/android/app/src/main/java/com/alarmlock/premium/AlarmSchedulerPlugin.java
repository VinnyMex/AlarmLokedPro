package com.alarmlock.premium;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

/**
 * JS-facing bridge for native alarm scheduling (see web/src/services/
 * nativeAlarmScheduler.ts). Alarms are registered with AlarmManager.
 * setAlarmClock() specifically — unlike setExactAndAllowWhileIdle(), it
 * needs no SCHEDULE_EXACT_ALARM permission and is exempt from Doze/App
 * Standby entirely, because it's the same API Android's own Clock app uses
 * and is inherently user-visible (status bar alarm icon).
 */
@CapacitorPlugin(
        name = "AlarmScheduler",
        permissions = {
                @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
        }
)
public class AlarmSchedulerPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id");
        String title = call.getString("title", "AlarmLock");
        String body = call.getString("body", "");
        Long triggerAt = call.getLong("triggerAt");

        if (id == null || triggerAt == null) {
            call.reject("id and triggerAt are required");
            return;
        }

        AlarmStore.StoredAlarm alarm = new AlarmStore.StoredAlarm(id, title, body, triggerAt);
        AlarmStore.save(getContext(), alarm);
        registerWithAlarmManager(getContext(), alarm);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        cancelWithAlarmManager(getContext(), id);
        AlarmStore.remove(getContext(), id);
        call.resolve();
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        List<AlarmStore.StoredAlarm> alarms = AlarmStore.loadAll(getContext());
        for (AlarmStore.StoredAlarm alarm : alarms) {
            cancelWithAlarmManager(getContext(), alarm.id);
        }
        AlarmStore.removeAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePendingAlarmId(PluginCall call) {
        String alarmId = AlarmStore.consumePendingAlarmId(getContext());
        JSObject result = new JSObject();
        result.put("alarmId", alarmId);
        call.resolve(result);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", "granted".equals(getPermissionState("notifications").toString()));
        call.resolve(result);
    }

    /**
     * Android 14+ separately gates whether a notification's full-screen
     * intent is actually allowed to take over the screen, even with the
     * USE_FULL_SCREEN_INTENT manifest permission declared. There's no
     * runtime prompt for this — only a system settings screen the user has
     * to visit themselves.
     */
    @PluginMethod
    public void checkFullScreenIntentPermission(PluginCall call) {
        JSObject result = new JSObject();
        boolean allowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            allowed = manager != null && manager.canUseFullScreenIntent();
        }
        result.put("allowed", allowed);
        call.resolve(result);
    }

    @PluginMethod
    public void openFullScreenIntentSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    static void registerWithAlarmManager(Context context, AlarmStore.StoredAlarm alarm) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent fireIntent = new Intent(context, AlarmReceiver.class);
        fireIntent.putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarm.id);
        fireIntent.putExtra("title", alarm.title);
        fireIntent.putExtra("body", alarm.body);

        int requestCode = alarm.id.hashCode();
        PendingIntent operation = PendingIntent.getBroadcast(
                context,
                requestCode,
                fireIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent showIntent = new Intent(context, MainActivity.class);
        showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent showPendingIntent = PendingIntent.getActivity(
                context,
                requestCode,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.setAlarmClock(
                new AlarmManager.AlarmClockInfo(alarm.triggerAt, showPendingIntent),
                operation
        );
    }

    static void cancelWithAlarmManager(Context context, String id) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent fireIntent = new Intent(context, AlarmReceiver.class);
        int requestCode = id.hashCode();
        PendingIntent operation = PendingIntent.getBroadcast(
                context,
                requestCode,
                fireIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarmManager.cancel(operation);
    }
}
