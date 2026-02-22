import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".lilys");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

interface Config {
  token?: string;
  userId?: string;
  resultLanguage?: string;
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

export function getToken(): string | undefined {
  return readConfig().token || process.env.LILYS_TOKEN;
}

export function setToken(token: string, userId?: string) {
  const config = readConfig();
  config.token = token;
  if (userId) {
    config.userId = userId;
  }
  writeConfig(config);
  console.log("Token stored successfully");
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

export function clearToken() {
  writeConfig({});
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
