/**
 * Firebase Authentication via Google OAuth
 * Uses localhost redirect to capture OAuth tokens without a browser extension.
 *
 * Flow:
 * 1. Start local HTTP server on a random port
 * 2. Open browser to Firebase Auth sign-in URL
 * 3. Firebase redirects back to localhost with the OAuth credential
 * 4. Exchange credential for Firebase ID token + refresh token
 */

const FIREBASE_API_KEY = "AIzaSyDCj-LjXZansR72baRx32upyFC2JieBwJw";
const FIREBASE_AUTH_DOMAIN = "lilys-release.firebaseapp.com";
const FIREBASE_PROJECT_ID = "lilys-release";

// Google OAuth client ID from Firebase config
// This is the Web client ID for lilys-release project
const GOOGLE_CLIENT_ID = "836463763579-YOUR_CLIENT_ID.apps.googleusercontent.com"; // placeholder

/**
 * Refresh an expired Firebase ID token using a refresh token.
 * This is the main function used for auto-renewal.
 */
export async function refreshIdToken(refreshToken: string): Promise<{
  idToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Token refresh failed:", error);
      return null;
    }

    const data = await response.json() as {
      id_token: string;
      refresh_token: string;
      expires_in: string;
      token_type: string;
      user_id: string;
      project_id: string;
    };

    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: parseInt(data.expires_in, 10),
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

/**
 * Sign in with email/password via Firebase REST API.
 * Returns ID token + refresh token.
 */
export async function signInWithEmailPassword(email: string, password: string): Promise<{
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
} | null> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      console.error("Sign-in failed:", error.error?.message || "Unknown error");
      return null;
    }

    const data = await response.json() as any;
    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      email: data.email,
    };
  } catch (error) {
    console.error("Sign-in error:", error);
    return null;
  }
}

/**
 * Sign in with Google OAuth credential (ID token from Google).
 * Used when we have a Google OAuth token from browser redirect.
 */
export async function signInWithGoogleCredential(googleIdToken: string): Promise<{
  idToken: string;
  refreshToken: string;
  localId: string;
  email: string;
} | null> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postBody: `id_token=${googleIdToken}&providerId=google.com`,
          requestUri: "https://lilys.ai",
          returnSecureToken: true,
          returnIdpCredential: true,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as any;
    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      email: data.email,
    };
  } catch {
    return null;
  }
}
