import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alarmlock.premium',
  appName: 'AlarmLock Premium',
  webDir: 'dist',
  // Loads the live deployed site instead of the bundled dist/ folder, so
  // web-only fixes (JS/CSS/HTML — the vast majority of changes) go live the
  // next time the app opens, with no new APK to build or reinstall. Only
  // native-level changes (AndroidManifest permissions, Gradle deps, Java
  // plugin code) still require a new APK.
  //
  // Trade-off: the app now needs connectivity on cold start to load this
  // URL, same as any website — the registered service worker (sw.js) should
  // cache the app shell for offline use after the first successful load
  // (WebViews support service workers same as a browser tab), but that's
  // not as bulletproof as fully bundled assets for a hard-offline scenario.
  // Remove this `server` block to go back to fully offline-bundled assets
  // if that trade-off stops being worth it.
  server: {
    url: 'https://alarmlock-web.onrender.com',
    cleartext: false,
  },
};

export default config;
