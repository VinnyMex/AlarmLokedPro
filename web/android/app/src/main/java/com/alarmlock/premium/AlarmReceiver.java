package com.alarmlock.premium;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Fires when AlarmManager's registered trigger time arrives — including
 * with the app fully killed and the device locked. Builds a full-screen-
 * intent notification pointing back at MainActivity, which is what lets the
 * alarm take over the screen the way a real alarm clock does instead of
 * waiting for the user to pull down the shade and tap it.
 */
public class AlarmReceiver extends BroadcastReceiver {

    static final String EXTRA_ALARM_ID = "alarmId";
    static final String EXTRA_ALARM_TRIGGER = "alarmTrigger";
    private static final String CHANNEL_ID = "alarmlock_challenge";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String alarmId = intent.getStringExtra(EXTRA_ALARM_ID);
        if (alarmId == null) return;

        PowerManager.WakeLock wakeLock = null;
        try {
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            if (title == null) title = "AlarmLock";
            if (body == null) body = "Show the requested object to silence the alarm.";

            // Hold a short wake lock so the CPU doesn't slip back to sleep
            // between this receiver running and the full-screen activity
            // actually coming up.
            PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                        "alarmlock:alarm-receiver"
                );
                wakeLock.acquire(10_000);
            }

            AlarmStore.setPendingAlarmId(context, alarmId);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            launchIntent.putExtra(EXTRA_ALARM_ID, alarmId);
            launchIntent.putExtra(EXTRA_ALARM_TRIGGER, true);

            int requestCode = alarmId.hashCode();
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                    context,
                    requestCode,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            createChannelIfNeeded(context);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setAutoCancel(true)
                    .setOngoing(true)
                    .setContentIntent(fullScreenPendingIntent)
                    .setFullScreenIntent(fullScreenPendingIntent, true);

            try {
                NotificationManagerCompat.from(context).notify(requestCode, builder.build());
            } catch (SecurityException e) {
                // POST_NOTIFICATIONS not granted (Android 13+). The full-screen
                // intent's own startActivity fallback below still gets the user
                // to the challenge screen; only the status-bar entry is lost.
            }

            // Some OEM skins only honor the full-screen intent when the screen
            // is already off; explicitly starting the activity covers the
            // "unlocked, app backgrounded" case too.
            try {
                context.startActivity(launchIntent);
            } catch (Exception e) {
                // Background-start restrictions vary by OEM/Android version; the
                // notification above is the fallback if this is blocked.
            }
        } catch (Exception e) {
            // Whatever went wrong, never let it crash the process — a missed
            // alarm firing is bad, a process death that also kills every
            // other pending alarm's receiver is worse.
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }

    private void createChannelIfNeeded(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alarm challenges",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Full-screen alerts when an AlarmLock challenge fires");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }
}
