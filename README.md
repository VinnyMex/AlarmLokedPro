# AlarmLock Premium

An alarm-clock app that forces you to prove you're awake by showing the camera a
requested household object before the alarm stops. Monetized via a recurring
subscription (with a 5-day trial) and a per-skip micro-charge, with XP,
streaks, ranking and social-share loops on top to drive retention.

This repo contains the MVP implementation described in the product spec:
a NestJS API (`/backend`) and an installable web app / PWA (`/web`).

## Repository layout

```
backend/     NestJS + PostgreSQL API — auth, alarms, billing, gamification, vision validation
web/         Vite + React + TypeScript PWA — alarms, camera challenge, progress, sharing
web/android/ Capacitor Android shell wrapping the same web app — real background alarms
```

## Why a PWA to start (and a native shell for real alarms)

Starting with a PWA gets a single codebase installable on desktop and mobile
home screens with no app-store review cycle, which is the fastest way to
validate the product hooks (challenge completion, streaks, trial conversion)
end to end. The trade-off: **browsers do not give a PWA a reliable way to
wake a locked device or run a full-screen alarm while the app is closed.**
`web/src/services/alarmScheduler.ts` fires alarms while the tab is open, but
that's not a substitute for a real background alarm.

For that, `web/android/` wraps the exact same web app in Capacitor with a
custom native plugin (`AlarmSchedulerPlugin`) that schedules alarms with
Android's `AlarmManager.setAlarmClock()` instead of a JS timer — the same
API the system Clock app uses, which is why it survives the app being killed
and is exempt from Doze/battery-optimization restrictions without needing
any special permission dance. `alarmScheduler.ts` detects when it's running
inside this native shell (`Capacitor.isNativePlatform()`) and delegates to
it automatically; everywhere else (plain browser, installed PWA) it falls
back to the JS timer unchanged. See "Android native wrapper" below for how
to build and run it. iOS has no equivalent yet — see Known gaps.

## Architecture

- **Web app**: Vite + React + TypeScript, `react-router-dom` for routing
  (a login gate, a bottom-tab-style shell, and a full-screen challenge
  route), the browser's `getUserMedia`/`<canvas>` for the challenge capture
  flow, and a hand-written service worker (`web/public/sw.js`) + web app
  manifest (`web/public/manifest.webmanifest`) for installability. State is
  fetched directly from the API per screen (no global store yet — add one,
  e.g. Zustand, once the screen count grows).
- **Backend**: NestJS + Prisma + PostgreSQL. One module per domain
  (`auth`, `users`, `consents`, `alarms`, `subscriptions`, `charges`,
  `progress`, `rankings`, `shares`, `audit-logs`, `vision`), matching the
  table/endpoint breakdown in the product spec.
- **Object recognition**: hybrid pipeline. The client runs on-device
  detection and posts `{label, confidence, boundingBoxAreaRatio}` to
  `POST /alarms/:id/validate`; `VisionService` re-checks that result against
  the challenge's confidence threshold and falls back to a Cloud Vision call
  for borderline confidence bands before accepting or rejecting the match.
  The on-device detector itself (`web/src/services/objectDetection.ts`) is
  stubbed — there's no in-browser object-detection model wired up yet (a
  TensorFlow.js/MediaPipe model is the natural next step); see Known gaps.
- **Billing**: subscription and per-skip charges go through `ChargesService`
  and `SubscriptionsService`. Both are written against a `provider`-agnostic
  interface (Stripe / Apple IAP / Google Play) and currently simulate a
  successful charge — swap `ChargesService.chargeNow` for a real PSP call
  once a provider is chosen.
- **Gamification**: XP, levels, streaks, and the non-cumulative free-skip
  reward all live in `ProgressService` (`backend/src/progress`), which is the
  single place that mutates `user_progress` — alarms and shares call into it
  rather than touching XP directly.

## Business rules implemented

- 5-day trial on first subscription activation; $5.00/month after.
- Skipping a challenge charges $0.99, billed to the next cycle.
- Every 5 consecutive challenge completions earns 1 free skip; the balance is
  capped at 1 (non-cumulative) and expires 30 days after being earned.
- XP: +10 per completion, +15 if no skip was used that streak, +20 bonus at a
  3-completion streak, +50 at a 5-completion streak, +10 for validating in
  under 10s, +5 for sharing an achievement.
- Location/weather sharing is opt-in and enforced server-side in
  `SharesService` — even if a client requests it, the server drops it unless
  `user_settings.enable_location_share` / `enable_weather_share` is on.
- Account deletion (`DELETE /me/account`) soft-deletes and scrubs PII while
  retaining financial records, per the LGPD data-retention note in the spec.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env   # point DATABASE_URL at a local Postgres instance
npm install
npm run prisma:migrate  # creates tables from prisma/schema.prisma
npm run start:dev       # http://localhost:3000
```

### Web app

```bash
cd web
npm install
npm run dev              # http://localhost:5173
# VITE_API_URL=https://your-api-host npm run dev   # if the API isn't on localhost:3000
```

### Everything at once with Docker Compose

```bash
cp .env.example .env   # set API_URL to your machine's LAN IP if testing from another device
docker compose up --build
```

This starts Postgres, runs migrations automatically, and serves the API on
`:3000` and the web app (built + served by nginx) on `:8080`. The web image
doesn't bake in the API URL at build time — `API_URL` is injected into a
small `runtime-config.js` when the container starts (see
`web/docker-entrypoint.sh`), so the same image works against any backend
host without rebuilding.

**Testing from a phone:** set `API_URL` in `.env` to this machine's LAN IP
(e.g. `http://192.168.1.50:3000`), not `localhost` — from the phone,
`localhost` resolves to the phone itself. Then open
`http://<that-same-LAN-IP>:8080` in the phone's browser (same Wi-Fi).
Login, alarms, gamification, share preview, and billing all work fine over
plain HTTP this way.

**The camera challenge specifically will not work over plain HTTP on a
phone.** Browsers only grant `getUserMedia` camera access in a "secure
context" (HTTPS, or `localhost` on the same device) — a LAN IP over `http://`
doesn't qualify. To test that screen from a phone, put an HTTPS tunnel in
front of port 8080, e.g.:

```bash
# after `docker compose up`, in another terminal:
ngrok http 8080
```

and open the `https://…ngrok…` URL it prints on the phone instead. For
anything beyond ad hoc testing, replace the tunnel with a real reverse proxy
(Caddy/Traefik) terminating TLS in front of the `web` service.

### Testing from a phone with no computer at all: deploy to Render

This needs no local machine, no Docker, and gives a real HTTPS URL — done
entirely from the Render dashboard in a phone browser, ~10 taps:

1. **Create a Render account** at render.com and connect your GitHub account
   (this repo, `VinnyMex/AlarmLokedPro`).
2. **New + → PostgreSQL** (free tier). Once it's up, open it and copy the
   **Internal Database URL** (not the external one — internal is
   unauthenticated-over-the-network-safe and doesn't need `sslmode=require`).
3. **New + → Web Service** → pick this repo → set **Root Directory** to
   `backend` and **Environment** to `Docker` (it'll pick up `backend/Dockerfile`
   automatically). Add environment variables:
   - `DATABASE_URL` — paste the Internal Database URL from step 2
   - `JWT_SECRET` — use Render's "Generate" button for a random value
   - `JWT_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=30d`
   - Leave `PORT` unset — Render injects its own and `main.ts` already reads
     `process.env.PORT`.
   Deploy, then copy the service's public URL once it's live (something like
   `https://alarmlock-backend.onrender.com`) — `POST /auth/register` against
   it should return tokens.
4. **New + → Static Site** → same repo → **Root Directory** `web`,
   **Build Command** `npm ci && npm run build`, **Publish Directory** `dist`.
   Add environment variable `VITE_API_URL` set to the backend URL from step
   3 (this bakes it into the build — `web/src/services/api.ts` falls back to
   it when there's no Docker runtime-config).
5. **Add the SPA rewrite rule** — required, or any deep link (e.g.
   `/settings`, `/challenge/:id`) 404s directly from the server instead of
   loading the app. `web/public/_redirects` is Netlify/Vercel syntax only;
   Render ignores it. On the static site: **Settings → Redirects/Rewrites →
   Add Rule** → source `/*`, destination `/index.html`, type **Rewrite**
   (or via API: `POST /v1/services/{id}/routes` with
   `{"type":"rewrite","source":"/*","destination":"/index.html"}`).
6. Open the static site's `https://…onrender.com` URL on your phone. Full
   HTTPS, so the camera challenge screen works like it would in production.

The backend Dockerfile runs `prisma migrate deploy` on every container
start, so the database schema is created automatically on first deploy —
no manual migration step needed. Render's free tier spins services down
after inactivity, so the first request after a while will be slow (~30s
cold start); that's expected, not a bug.

Camera access (`getUserMedia`) requires a secure context — `localhost` is
exempt, but testing from another device on your LAN needs HTTPS or a tunnel
(e.g. `ngrok`).

## Android native wrapper (real background alarms)

This is what makes an alarm actually fire with the app closed and the phone
locked — the PWA fundamentally cannot do that (see above). It's a real
Android app (Capacitor shell + custom Java plugin), not a bookmark.

### How it works

- `web/src/services/nativeAlarmScheduler.ts` is a typed bridge to
  `web/android/app/src/main/java/com/alarmlock/premium/AlarmSchedulerPlugin.java`.
  `alarmScheduler.ts` calls it instead of `setTimeout` whenever
  `Capacitor.isNativePlatform()` is true.
- Scheduling uses `AlarmManager.setAlarmClock()`, not
  `setExactAndAllowWhileIdle()` — deliberately. `setAlarmClock` is the same
  API the system Clock app uses, is exempt from Doze/App-Standby/battery
  optimization everywhere, and (unlike exact alarms on Android 12+) needs no
  special `SCHEDULE_EXACT_ALARM` permission grant.
- When it fires, `AlarmReceiver.java` posts a notification with
  `setFullScreenIntent()` pointing back at `MainActivity` — the standard
  alarm-clock idiom, letting Android bring the app to the front over the
  lock screen instead of waiting for a tap. `MainActivity.java` then applies
  `setShowWhenLocked`/`setTurnScreenOn` and requests a keyguard dismiss (a
  PIN/biometric lock still requires the user to unlock, same as any other
  alarm app).
- The fired alarm's id is handed to the web app via a small
  SharedPreferences value (`AlarmStore.java`), not a deep link — the native
  side has no notion of the SPA's routes. `App.tsx`'s `PendingAlarmHandler`
  reads it on cold start and on every resume (`@capacitor/app`'s `resume`
  event) and navigates to `/challenge/:id`.
- `BootReceiver.java` re-registers every still-future alarm with
  `AlarmManager` on `BOOT_COMPLETED`, since Android wipes all scheduled
  alarms on every reboot.

### Building it

```bash
cd web
# IMPORTANT: bake in the real backend URL — inside the app, "localhost"
# means the phone itself, not your deployed API.
VITE_API_URL=https://alarmlock-backend.onrender.com npm run build
npx cap sync android
cd android
./gradlew assembleDebug   # -> app/build/outputs/apk/debug/app-debug.apk
```

Requires a JDK (17+) and the Android SDK (command-line tools + platform 34+
& build-tools are enough; you don't need full Android Studio, though it's
the easier path if you have it — open `web/android` in it and hit Run).
`local.properties` (holding your `sdk.dir`) is gitignored; create it
yourself: `echo "sdk.dir=/path/to/Android/sdk" > web/android/local.properties`.

Install the resulting APK with `adb install -r app-debug.apk`, or copy it to
the phone and open it directly (Android will prompt to allow installs from
that source — this is a debug build, not from the Play Store).

### First-run setup on the phone

Open Settings in the app and tap both permission buttons under "Alarm
permissions (Android)":
1. **Allow notifications** (Android 13+ requires this at runtime or the
   fallback notification can't show — the full-screen takeover can still
   work without it, but you lose the status-bar entry).
2. **Allow full-screen alarms** (Android 14+ only, and only shown if not
   already granted) — this opens a system settings screen; there's no
   in-app runtime prompt for it, Android requires the user to flip it
   themselves.

### What's actually verified vs. not

Verified in this repo: the full Gradle build (Java 21, Android SDK 34/36,
AGP 8.13) compiles and packages cleanly, producing a working
`app-debug.apk`, and the merged manifest carries every permission/receiver
correctly. **Not verified**: real-device behavior — the actual lock-screen
takeover, the Android 14 full-screen-intent settings flow, notification
permission prompts, and boot-time alarm rescheduling after a real reboot all
need a physical phone or emulator, which wasn't available to test this from.
Some OEM battery managers (Xiaomi/MIUI, Huawei, some Samsung skins) are
known to throttle background receivers more aggressively than stock Android
even for apps using the "correct" APIs — if alarms are unreliable on a
specific phone, the fix is usually whitelisting the app in that OEM's
battery/auto-start settings, not a bug in this code. Report back what you
see on a real device so anything that needs fixing gets fixed.

### iOS

Out of scope for this pass (Android was prioritized because it's the only
platform where a true forced full-screen alarm is achievable at all without
a special Apple entitlement — see the "Why a PWA" section above). The same
Capacitor project could get an `ios/` platform later, but it would only ever
manage a local notification the user has to tap, not a forced takeover.

### Fixes from real-device testing

Two bugs only showed up once this actually ran on a phone instead of just
compiling in this sandbox:

- **Crash right after login.** `AlarmSchedulerPlugin`'s notification
  permission callback called `.toString()` on `getPermissionState(...)`,
  which can return `null` — an uncaught `NullPointerException` there kills
  the whole app, and this fired automatically on every Home screen mount
  (right after login) on Android 13+. Fixed by comparing the `PermissionState`
  enum directly instead, and every plugin method (and both
  `BroadcastReceiver`s) now catches its own exceptions rather than letting
  anything escape uncaught — a missed notification or a failed reschedule is
  recoverable, a process crash is not. The automatic permission request on
  Home mount was also removed entirely in favor of the explicit buttons in
  Settings, so nothing native fires unprompted right after login anymore.
- **Session not persisting.** The web app never actually called
  `POST /auth/refresh` — access tokens expire after 15 minutes
  (`JWT_EXPIRES_IN`) and every request just silently started failing after
  that with no visible error and no re-login prompt. `api.ts` now refreshes
  transparently on a 401 and retries the original request once; only a
  refresh failure (refresh token itself expired/revoked, i.e. after the
  full 30-day `JWT_REFRESH_EXPIRES_IN` window) clears tokens and bounces to
  `/login`. Combined with the crash fix, staying logged in should now just
  work — Capacitor's WebView localStorage already persists across app
  restarts on its own, that part was never the problem.

A second round of real-device feedback surfaced more:

- **Camera/location permission dialogs never appeared.** `AndroidManifest.xml`
  was simply missing `<uses-permission android:name="android.permission.CAMERA">`
  entirely (and the two location permissions) — Capacitor's built-in
  `BridgeWebChromeClient` already handles bridging `getUserMedia`/
  `navigator.geolocation` to a native runtime-permission dialog (confirmed by
  reading its source in `node_modules/@capacitor/android`), it just had no
  permission to request. Declaring `CAMERA`, `ACCESS_FINE_LOCATION`, and
  `ACCESS_COARSE_LOCATION` was the actual fix — no custom WebView code
  needed. `web/src/services/location.ts` (using `@capacitor/geolocation`)
  and the Share screen's location toggle now request a real fix instead of
  never calling the API at all.
- **No way to edit or delete an alarm.** Tapping an alarm card used to jump
  straight into triggering a live challenge attempt. It now opens an edit
  form (`CreateAlarmScreen` doing double duty via an optional `:alarmId`
  route param) with save (`PATCH /alarms/:id`), delete
  (`DELETE /alarms/:id`), and a "test this challenge now" button that's the
  new way to reach the trigger flow on demand. Added `GET /alarms/:id` to
  the backend to load a single alarm for the form.
- **Top of the app cut off / under the status bar.** Targeting SDK 36
  (Android 15+) means the OS enforces edge-to-edge layout, so the WebView
  content extends behind the status bar by default now. Added
  `padding-top: env(safe-area-inset-top)` to the app shell, the login
  screen, and the tab bar's height accounting.
- **Password field had no show/hide toggle.** Added one to the login
  screen.
- **"Do I really have to reinstall the APK for every fix?"** No, not
  anymore for web-only changes — see "Loading the live site instead of a
  bundled build" below.

### Loading the live site instead of a bundled build

`capacitor.config.ts` now points `server.url` at the deployed
`alarmlock-web` Render URL instead of loading the bundled `dist/` folder.
Practically: any fix that's pure web (JS/CSS/HTML — the overwhelming
majority of what's been fixed in this project so far) goes live the next
time the app is opened, once it's pushed and Render redeploys — no new APK,
no reinstall. **Native-level changes still need a new APK** (anything
touching `AndroidManifest.xml`, `build.gradle` dependencies, or the Java
plugin code) — the camera/location permissions and the edit-alarm route
change above are exactly why this round still came with a new APK.

Trade-off worth knowing: the app now needs connectivity on cold start to
load that URL, like any website. The registered service worker should cache
the app shell for offline use after a first successful load (WebViews
support service workers same as a browser tab), but that's not as
bulletproof as fully bundled assets for a genuinely offline scenario — if
that becomes a real problem, remove the `server` block from
`capacitor.config.ts` to go back to fully local, always-offline assets (at
the cost of needing a new APK for every web fix again).

### Google Sign-In

Backend (`POST /auth/google`) and native Android (Credential Manager, the
current Google-recommended API — not the deprecated `GoogleSignInClient`,
and not Google Identity Services' web JS, which Google blocks inside
embedded WebViews) are both implemented and compiled/verified. It's inert
until you provide real Google OAuth credentials — I can't create those for
you, they're tied to your Google account:

1. In [Google Cloud Console](https://console.cloud.google.com/) (any
   project), go to **APIs & Services → Credentials** and configure the
   OAuth consent screen if you haven't already (External is fine for
   testing).
2. **Create Credentials → OAuth client ID → Web application.** No redirect
   URIs needed for this flow. This gives you a **Web Client ID** — not a
   secret, safe to put in both configs below.
3. **Create Credentials → OAuth client ID → Android.** Package name
   `com.alarmlock.premium`. SHA-1: for the exact APK already sent to you
   (built in this environment's auto-generated debug keystore),
   it's `3E:A1:D4:3D:50:FF:92:4A:FB:A5:1F:5E:04:12:D2:F0:AE:C4:0B:2B`. If you
   build the APK yourself later with your own debug keystore instead, get
   your own SHA-1 with:
   `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   You don't need to put anything from this Android client ID into any
   config file — Google matches it internally by package name + SHA-1 when
   the app requests a credential.
4. Set the **Web Client ID** from step 2 as `GOOGLE_CLIENT_ID` on the
   backend (Render → `alarmlock-backend` → Environment) and as
   `VITE_GOOGLE_CLIENT_ID` when building the web app / Android APK (same
   value in both places — the button is hidden entirely until this is set).
5. Add `VITE_GOOGLE_CLIENT_ID` as an environment variable on the
   `alarmlock-web` Render static site (same Web Client ID value) and
   redeploy it. Since the Android app now loads that live site directly
   (see "Loading the live site instead of a bundled build" above), that's
   the only step needed — no new APK required for this one.

## API surface

See `backend/src/*/[name].controller.ts` for the implementation of every
endpoint in the spec: auth (register/login/refresh), `/me` + settings,
consents, subscriptions (subscribe/cancel/status), alarms (CRUD +
trigger/validate/skip-item), progress, rankings, `/shares/render`, charges,
audit-logs, and account deletion.

## Known gaps / next steps

This is the Phase 0–1 MVP slice (see the product spec's roadmap). Not yet
built:

- **Reliable background alarms on iOS.** Solved for Android (see "Android
  native wrapper" above). iOS has no equivalent — Apple doesn't allow
  third-party apps to force a full-screen takeover from the background
  without a Critical Alerts entitlement that isn't available for general
  apps, so an iOS build would be limited to a tappable local notification.
- Real in-browser object detection (TensorFlow.js/MediaPipe) — currently
  stubbed to always report a confident match so the rest of the flow is
  demoable end to end.
- Real PSP integration (Stripe/Apple IAP/Google Play) — `ChargesService` and
  `SubscriptionsService` are written to the right interface but simulate
  success.
- Push notifications beyond the basic `Notification` API call while the tab
  is open; no Web Push subscription flow yet.
- Real app icons — `web/public/icon.svg` is a placeholder; iOS home-screen
  install wants a PNG `apple-touch-icon`, not SVG.
- Weather API integration for the share screen (currently a static preview).
- Referral/growth-loop features (Phase 4 in the spec).
- Anti-fraud, monitoring, and the automated ranking-recompute cron
  (`RankingsService.recompute` exists but isn't scheduled yet).
- Rate limiting is enabled globally via `@nestjs/throttler`; per-endpoint
  tuning (e.g. stricter limits on `/alarms/:id/validate`) is still open.
