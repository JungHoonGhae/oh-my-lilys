import { existsSync, statSync } from "fs";

import { getConfig, getConfigFilePath, getToken } from "../utils/config.js";
import { getUserPreferences } from "../api/client.js";
import { logger, styles } from "../utils/logger.js";

const PACKAGE_NAME = "oh-my-lilys";
const NPM_REGISTRY = "https://registry.npmjs.org";

interface DoctorResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

export async function doctor(currentVersion?: string) {
  const version = currentVersion ?? "unknown";

  logger.log(logger.bold("oh-my-lilys Doctor"));
  logger.break();

  const results: DoctorResult[] = [];

  results.push(await checkVersion(version));
  results.push(checkToken());
  results.push(checkTokenExpiry());
  results.push(await checkApiConnection());
  results.push(checkConfig());
  results.push(checkConfigPermissions());

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  for (const result of results) {
    const icon = result.status === "pass" ? "✓" : result.status === "warn" ? "⚠" : "✖";
    const color = result.status === "pass" ? logger.success : result.status === "warn" ? logger.warn : logger.error;
    
    logger.log(`${icon} ${styles.key(result.name)}`);
    logger.dim(`   ${result.message}`);
    logger.break();

    if (result.status === "pass") passCount++;
    else if (result.status === "warn") warnCount++;
    else failCount++;
  }

  logger.log(logger.bold("Summary:"));
  logger.log(`  ${styles.value(String(passCount))} passed`);
  if (warnCount > 0) logger.log(`  ${styles.value(String(warnCount))} warnings`);
  if (failCount > 0) logger.log(`  ${styles.value(String(failCount))} failed`);
  logger.break();

  if (failCount > 0) {
    logger.error("Some checks failed. Run 'lilys login' to re-authenticate.");
  } else if (warnCount > 0) {
    logger.warn("Some checks have warnings. Everything might not work correctly.");
  } else {
    logger.success("All checks passed!");
  }
}

function checkToken(): DoctorResult {
  const token = getToken();
  
  if (!token) {
    return {
      name: "Authentication",
      status: "fail",
      message: "Not logged in. Run 'lilys login' first.",
    };
  }

  return {
    name: "Authentication",
    status: "pass",
    message: "Token found",
  };
}

function checkTokenExpiry(): DoctorResult {
  const config = getConfig();
  const token = config.token;

  if (!token) {
    return {
      name: "Token Expiry",
      status: "warn",
      message: "Cannot check expiry without token",
    };
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return {
        name: "Token Expiry",
        status: "warn",
        message: "Token format looks unusual",
      };
    }

    const payload = JSON.parse(Buffer.from(parts[1]!, "base64").toString());
    const exp = payload.exp;

    if (!exp) {
      return {
        name: "Token Expiry",
        status: "warn",
        message: "No expiry in token",
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = exp - now;

    if (expiresIn < 0) {
      return {
        name: "Token Expiry",
        status: "fail",
        message: `Token expired ${Math.abs(expiresIn)}s ago. Run 'lilys login'.`,
      };
    }

    if (expiresIn < 3600) {
      return {
        name: "Token Expiry",
        status: "warn",
        message: `Token expires in ${Math.floor(expiresIn / 60)} minutes`,
      };
    }

    return {
      name: "Token Expiry",
      status: "pass",
      message: `Token valid for ${Math.floor(expiresIn / 3600)}h ${Math.floor((expiresIn % 3600) / 60)}m`,
    };
  } catch {
    return {
      name: "Token Expiry",
      status: "warn",
      message: "Could not parse token",
    };
  }
}

async function checkVersion(version: string): Promise<DoctorResult> {
  if (version === "unknown") {
    return {
      name: "Version",
      status: "warn",
      message: "Current version unknown",
    };
  }

  try {
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/latest`);
    const data = await response.json() as { version: string };
    const latestVersion = data.version;

    if (latestVersion === version) {
      return {
        name: "Version",
        status: "pass",
        message: `v${version} (latest)`,
      };
    }

    return {
      name: "Version",
      status: "warn",
      message: `v${version} → v${latestVersion} available (run 'lilys upgrade')`,
    };
  } catch {
    return {
      name: "Version",
      status: "warn",
      message: `v${version} (could not check for updates)`,
    };
  }
}

function checkConfigPermissions(): DoctorResult {
  const configFile = getConfigFilePath();
  if (!existsSync(configFile)) {
    return {
      name: "Config Permissions",
      status: "warn",
      message: "Config file not found",
    };
  }

  if (process.platform === "win32") {
    return {
      name: "Config Permissions",
      status: "warn",
      message: "Skipped on Windows",
    };
  }

  try {
    const mode = statSync(configFile).mode & 0o777;
    if (mode !== 0o600) {
      return {
        name: "Config Permissions",
        status: "warn",
        message: `Expected 600, got ${mode.toString(8)}`,
      };
    }

    return {
      name: "Config Permissions",
      status: "pass",
      message: "Permissions are secure (600)",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      name: "Config Permissions",
      status: "warn",
      message: `Could not check permissions: ${msg}`,
    };
  }
}

async function checkApiConnection(): Promise<DoctorResult> {
  const token = getToken();

  if (!token) {
    return {
      name: "API Connection",
      status: "warn",
      message: "Skipped - no token",
    };
  }

  try {
    await getUserPreferences();
    return {
      name: "API Connection",
      status: "pass",
      message: "Successfully connected to lilys.ai API",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("invalid_token") || msg.includes("Unauthorized")) {
      return {
        name: "API Connection",
        status: "fail",
        message: "Token invalid. Run 'lilys login' to refresh.",
      };
    }
    return {
      name: "API Connection",
      status: "fail",
      message: `Connection failed: ${msg}`,
    };
  }
}

function checkConfig(): DoctorResult {
  const config = getConfig();

  if (!config.token && !config.resultLanguage) {
    return {
      name: "Configuration",
      status: "warn",
      message: "No config found. Run 'lilys login' first.",
    };
  }

  const issues: string[] = [];

  if (config.resultLanguage) {
    const validLangs = ["en", "ko", "ja", "zh", "es", "fr", "de"];
    if (!validLangs.includes(config.resultLanguage)) {
      issues.push(`Unknown language: ${config.resultLanguage}`);
    }
  }

  if (issues.length > 0) {
    return {
      name: "Configuration",
      status: "warn",
      message: issues.join(", "),
    };
  }

  return {
    name: "Configuration",
    status: "pass",
    message: "Config looks good",
  };
}
