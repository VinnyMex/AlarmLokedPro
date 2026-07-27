import { registerPlugin } from '@capacitor/core';
import { isNativeAlarmSchedulerAvailable } from './nativeAlarmScheduler';

// The OAuth 2.0 "Web application" Client ID from Google Cloud Console. Not
// a secret — safe to bake into the client build. Used both by the web
// (Google Identity Services) flow below and passed to the native Android
// Credential Manager flow as its "server client id" (see
// android/.../GoogleAuthPlugin.java) so both issue an ID token this
// server's GOOGLE_CLIENT_ID can verify against the same audience.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface GoogleAuthPlugin {
  signIn(options: { serverClientId: string }): Promise<{ idToken: string; email: string; name: string }>;
}

// Native side lives at web/android/app/src/main/java/com/alarmlock/premium/
// GoogleAuthPlugin.java. Only registered inside the Capacitor Android
// shell — see signInWithGoogle() below for the web fallback.
const nativeGoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth');

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }
  return gisScriptPromise;
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

/**
 * Renders Google's own "Sign in with Google" button into `container` and
 * resolves with an ID token once the user completes the flow. Web/PWA only —
 * Google explicitly disallows this JS flow inside embedded WebViews
 * ("disallowed_useragent"), which is exactly where the Capacitor Android
 * build runs; use signInWithGoogleNative() there instead.
 */
export async function renderGoogleSignInButton(container: HTMLElement): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured (missing VITE_GOOGLE_CLIENT_ID)');
  }
  await loadGoogleIdentityServices();

  return new Promise((resolve) => {
    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => resolve(response.credential),
    });
    window.google!.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'filled_black',
      text: 'continue_with',
      shape: 'pill',
      width: 300,
    });
  });
}

export async function signInWithGoogleNative(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured (missing VITE_GOOGLE_CLIENT_ID)');
  }
  const result = await nativeGoogleAuth.signIn({ serverClientId: GOOGLE_CLIENT_ID });
  return result.idToken;
}

export function isNativeGoogleSignInAvailable(): boolean {
  return isNativeAlarmSchedulerAvailable(); // same gate: true only in the Capacitor Android shell
}
