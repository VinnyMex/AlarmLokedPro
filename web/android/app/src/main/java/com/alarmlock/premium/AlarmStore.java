package com.alarmlock.premium;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Persists scheduled alarms (so BootReceiver can re-register them with
 * AlarmManager after a reboot, since AlarmManager itself forgets everything
 * on restart) and the "an alarm just fired" handoff value that the web app
 * reads on resume to know which challenge screen to open.
 */
final class AlarmStore {
    private static final String PREFS_NAME = "alarmlock_prefs";
    private static final String KEY_ALARMS = "scheduled_alarms";
    private static final String KEY_PENDING_ALARM_ID = "pending_alarm_id";

    private AlarmStore() {}

    static class StoredAlarm {
        final String id;
        final String title;
        final String body;
        final long triggerAt;

        StoredAlarm(String id, String title, String body, long triggerAt) {
            this.id = id;
            this.title = title;
            this.body = body;
            this.triggerAt = triggerAt;
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static void save(Context context, StoredAlarm alarm) {
        List<StoredAlarm> alarms = loadAll(context);
        List<StoredAlarm> next = new ArrayList<>();
        for (StoredAlarm existing : alarms) {
            if (!existing.id.equals(alarm.id)) {
                next.add(existing);
            }
        }
        next.add(alarm);
        writeAll(context, next);
    }

    static void remove(Context context, String id) {
        List<StoredAlarm> alarms = loadAll(context);
        List<StoredAlarm> next = new ArrayList<>();
        for (StoredAlarm existing : alarms) {
            if (!existing.id.equals(id)) {
                next.add(existing);
            }
        }
        writeAll(context, next);
    }

    static void removeAll(Context context) {
        writeAll(context, new ArrayList<StoredAlarm>());
    }

    static List<StoredAlarm> loadAll(Context context) {
        List<StoredAlarm> result = new ArrayList<>();
        String raw = prefs(context).getString(KEY_ALARMS, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                result.add(new StoredAlarm(
                        obj.getString("id"),
                        obj.optString("title", "AlarmLock"),
                        obj.optString("body", ""),
                        obj.getLong("triggerAt")
                ));
            }
        } catch (JSONException e) {
            // Corrupt prefs shouldn't crash the app; treat as empty.
        }
        return result;
    }

    private static void writeAll(Context context, List<StoredAlarm> alarms) {
        JSONArray array = new JSONArray();
        for (StoredAlarm alarm : alarms) {
            JSONObject obj = new JSONObject();
            try {
                obj.put("id", alarm.id);
                obj.put("title", alarm.title);
                obj.put("body", alarm.body);
                obj.put("triggerAt", alarm.triggerAt);
                array.put(obj);
            } catch (JSONException e) {
                // Skip anything that somehow fails to serialize.
            }
        }
        prefs(context).edit().putString(KEY_ALARMS, array.toString()).apply();
    }

    static void setPendingAlarmId(Context context, String alarmId) {
        prefs(context).edit().putString(KEY_PENDING_ALARM_ID, alarmId).apply();
    }

    /** Returns and clears the pending alarm id, if any. */
    static String consumePendingAlarmId(Context context) {
        SharedPreferences p = prefs(context);
        String value = p.getString(KEY_PENDING_ALARM_ID, null);
        if (value != null) {
            p.edit().remove(KEY_PENDING_ALARM_ID).apply();
        }
        return value;
    }
}
