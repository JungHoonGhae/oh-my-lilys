import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { isKeychainSupported, getFromKeychain, saveToKeychain, deleteFromKeychain } from "./keychain.js";

const CONFIG_DIR = join(homedir(), ".lilys");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

interface Config {
  token?: string;
  refreshToken?: string;
  userId?: string;
  resultLanguage?: string;
  useKeychain?: boolean;
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (process.platform !== "win32") {
    try {
      chmodSync(CONFIG_DIR, 0o700);
    } catch (error) {
      void error;
    }
  }
}

function readConfig(): Config {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeConfig(config: Config) {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  if (process.platform !== "win32") {
    try {
      chmodSync(CONFIG_FILE, 0o600);
    } catch (error) {
      void error;
    }
  }
}

export function getConfig(): Config {
  return readConfig();
}

// Cached token to avoid repeated Keychain lookups within the same process
let cachedToken: string | undefined;

export function getToken(): string | undefined {
  // Environment variable takes highest priority
  if (process.env.LILYS_TOKEN) return process.env.LILYS_TOKEN;

  // Return cached token if available
  if (cachedToken) return cachedToken;

  const config = readConfig();

  // If Keychain is in use, token is stored there (not in config file)
  if (config.useKeychain) {
    // Keychain read is async, but getToken is sync for backward compat.
    // The token should have been loaded via loadTokenFromKeychain() at startup.
    // Fall through to config.token as sync fallback.
  }

  return config.token;
}

/**
 * Async token getter that checks Keychain first.
 * Call this at startup or when you need the freshest token.
 */
export async function getTokenAsync(): Promise<string | undefined> {
  if (process.env.LILYS_TOKEN) return process.env.LILYS_TOKEN;

  const config = readConfig();

  if (config.useKeychain && isKeychainSupported()) {
    const keychainToken = await getFromKeychain();
    if (keychainToken) {
      cachedToken = keychainToken;
      return keychainToken;
    }
  }

  return config.token;
}

/**
 * Load token from Keychain into cache for sync access.
 * Should be called once at CLI startup.
 */
export async function loadTokenFromKeychain(): Promise<void> {
  const config = readConfig();
  if (config.useKeychain && isKeychainSupported()) {
    const keychainToken = await getFromKeychain();
    if (keychainToken) {
      cachedToken = keychainToken;
    }
  }
}

export async function setToken(token: string, userId?: string) {
  const config = readConfig();

  if (userId) {
    config.userId = userId;
  }

  // On macOS, use Keychain by default
  if (isKeychainSupported()) {
    const saved = await saveToKeychain(token);
    if (saved) {
      config.useKeychain = true;
      delete config.token; // Don't store token in plaintext file
      cachedToken = token;
      writeConfig(config);
      console.log("Token stored in macOS Keychain");
      return;
    }
  }

  // Fallback: store in config file
  config.token = token;
  config.useKeychain = false;
  cachedToken = token;
  writeConfig(config);
  console.log("Token stored in config file");
}

export function getRefreshToken(): string | undefined {
  return readConfig().refreshToken;
}

export function setRefreshToken(refreshToken: string) {
  const config = readConfig();
  config.refreshToken = refreshToken;
  writeConfig(config);
}

/**
 * Refresh Firebase ID token using stored refresh token.
 * Returns the new ID token, or null if refresh failed.
 */
const FIREBASE_API_KEY = "AIzaSyDCj-LjXZansR72baRx32upyFC2JieBwJw";

export async function refreshFirebaseToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );

    if (!response.ok) return null;

    const data = await response.json() as {
      id_token: string;
      refresh_token: string;
      expires_in: string;
    };

    // Save new tokens
    await setToken(data.id_token);
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }

    return data.id_token;
  } catch {
    return null;
  }
}

/**
 * Check if stored ID token is expired (JWT exp claim).
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    // base64url decode payload
    let payload = parts[1]!;
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";

    const decoded = JSON.parse(atob(payload));
    const exp = decoded.exp;
    if (!exp) return true;

    // Expired if less than 5 minutes remaining
    return Date.now() / 1000 > exp - 300;
  } catch {
    return true;
  }
}

/**
 * Get a valid token, auto-refreshing if expired.
 */
export async function getValidToken(): Promise<string | undefined> {
  const token = await getTokenAsync();

  if (token && !isTokenExpired()) {
    return token;
  }

  // Try to refresh
  const newToken = await refreshFirebaseToken();
  if (newToken) return newToken;

  // Return expired token as last resort (let server reject it)
  return token;
}

export function getResultLanguage(): string {
  return readConfig().resultLanguage || process.env.LILYS_RESULT_LANG || "en";
}

export function setResultLanguage(lang: string) {
  const config = readConfig();
  config.resultLanguage = lang;
  writeConfig(config);
  console.log(`AI Result Language set to: ${lang}`);
}

export async function clearToken() {
  const config = readConfig();
  if (config.useKeychain && isKeychainSupported()) {
    await deleteFromKeychain();
  }
  delete config.token;
  delete config.useKeychain;
  cachedToken = undefined;
  writeConfig(config);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getTokenAsync();
  return !!token;
}
