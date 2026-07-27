# AlarmLock Premium

An alarm-clock app that forces you to prove you're awake by showing the camera a
requested household object before the alarm stops. Monetized via a recurring
subscription (with a 5-day trial) and a per-skip micro-charge, with XP,
streaks, ranking and social-share loops on top to drive retention.

This repo contains the MVP implementation described in the product spec:
a NestJS API (`/backend`) and an installable web app / PWA (`/web`).

## Repository layout

```
backend/   NestJS + PostgreSQL API — auth, alarms, billing, gamification, vision validation
web/       Vite + React + TypeScript PWA — alarms, camera challenge, progress, sharing
```

## Why a PWA to start

Starting with a PWA gets a single codebase installable on desktop and mobile
home screens with no app-store review cycle, which is the fastest way to
validate the product hooks (challenge completion, streaks, trial conversion)
end to end. The trade-off to know going in: **browsers do not give a PWA a
reliable way to wake a locked device or run a full-screen alarm while the
app is closed.** `web/src/services/alarmScheduler.ts` fires alarms while the
tab is open (and best-effort via Notifications when backgrounded on some
platforms), but it is not a substitute for a native background alarm. If
"wakes you up even if you close the app" becomes a hard requirement, wrap
this same UI in Capacitor or rebuild the alarm-firing path natively — see
Known gaps below.

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

Camera access (`getUserMedia`) requires a secure context — `localhost` is
exempt, but testing from another device on your LAN needs HTTPS or a tunnel
(e.g. `ngrok`).

## API surface

See `backend/src/*/[name].controller.ts` for the implementation of every
endpoint in the spec: auth (register/login/refresh), `/me` + settings,
consents, subscriptions (subscribe/cancel/status), alarms (CRUD +
trigger/validate/skip-item), progress, rankings, `/shares/render`, charges,
audit-logs, and account deletion.

## Known gaps / next steps

This is the Phase 0–1 MVP slice (see the product spec's roadmap). Not yet
built:

- **Reliable background alarms.** The single biggest gap for an "alarm"
  product built as a PWA — see the section above. Plan to wrap the web UI in
  Capacitor (or port the challenge/alarm screens natively) once this needs
  to work with the app closed and the phone locked.
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
