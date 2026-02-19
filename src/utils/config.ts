import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".lilys");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
  userId?: string;
  resultLanguage?: string;
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
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
}

export function getConfig(): Config {
  return readConfig();
}

export function getToken(): string | undefined {
  return readConfig().token;
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
