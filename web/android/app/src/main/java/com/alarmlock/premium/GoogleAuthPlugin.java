package com.alarmlock.premium;

import android.app.Activity;
import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executor;

/**
 * "Sign in with Google" via Android's Credential Manager (the current
 * Google-recommended replacement for the deprecated GoogleSignInClient
 * API), not Google Identity Services' web JS — Google actively blocks that
 * flow inside embedded WebViews ("disallowed_useragent"), which is exactly
 * where Capacitor apps run. The JS side only ever sees an idToken, verified
 * server-side by AuthService.loginWithGoogle (see backend/src/auth) — the
 * same contract the web/browser build satisfies with Google Identity
 * Services directly (see web/src/screens/LoginScreen.tsx).
 */
@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        if (serverClientId == null || serverClientId.isEmpty()) {
            call.reject("serverClientId is required (the Google OAuth Web Client ID)");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity available to launch sign-in");
            return;
        }

        try {
            CredentialManager credentialManager = CredentialManager.create(getContext());

            GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(serverClientId).build();
            GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(option)
                    .build();

            Executor executor = ContextCompat.getMainExecutor(getContext());

            credentialManager.getCredentialAsync(
                    activity,
                    request,
                    new CancellationSignal(),
                    executor,
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            try {
                                GoogleIdTokenCredential credential = GoogleIdTokenCredential.createFrom(
                                        response.getCredential().getData()
                                );
                                JSObject result = new JSObject();
                                result.put("idToken", credential.getIdToken());
                                result.put("email", credential.getId());
                                result.put("name", credential.getDisplayName());
                                call.resolve(result);
                            } catch (Exception e) {
                                call.reject("Failed to parse Google credential: " + e.getMessage(), e);
                            }
                        }

                        @Override
                        public void onError(GetCredentialException e) {
                            call.reject("Google sign-in failed: " + e.getMessage(), e);
                        }
                    }
            );
        } catch (Exception e) {
            call.reject("Google sign-in failed: " + e.getMessage(), e);
        }
    }
}
