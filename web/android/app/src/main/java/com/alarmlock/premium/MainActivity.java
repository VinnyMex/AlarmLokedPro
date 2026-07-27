package com.alarmlock.premium;

import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmSchedulerPlugin.class);
        registerPlugin(GoogleAuthPlugin.class);
        super.onCreate(savedInstanceState);
        handleAlarmIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAlarmIntent(intent);
    }

    /**
     * When launched (or re-launched, via the singleTask launch mode) from
     * AlarmReceiver's full-screen intent, make sure this activity can
     * actually present over a locked screen and wake the display — none of
     * that is implied just by starting the activity.
     */
    private void handleAlarmIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra(AlarmReceiver.EXTRA_ALARM_TRIGGER, false)) {
            return;
        }

        String alarmId = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID);
        if (alarmId != null) {
            AlarmStore.setPendingAlarmId(this, alarmId);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                // Only dismisses swipe/no-secure-lock screens; a PIN/biometric
                // lock still requires the user to unlock, same as any other
                // alarm app.
                keyguardManager.requestDismissKeyguard(this, null);
            }
        }
    }
}
