import { spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { getResultLanguage } from "./config.js";

const PROFILE_DIR = join(homedir(), ".lilys-chrome-profile");
const SESSION_NAME = "lilys-auth";

function getLoginUrl(): string {
  const lang = getResultLanguage();
  if (lang && lang !== "en") {
    return `https://lilys.ai/${lang}/signup`;
  }
  return "https://lilys.ai/signup";
}

function execCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

export async function isBrowserRunning(): Promise<boolean> {
  try {
    const output = await execCommand("playwright-cli", ["list"]);
    return output.includes(SESSION_NAME) && output.includes("status: open");
  } catch {
    return false;
  }
}

export async function openBrowser(headless: boolean = true): Promise<void> {
  const loginUrl = getLoginUrl();
  const args = [
    `-s=${SESSION_NAME}`,
    "open",
    loginUrl,
    "--persistent",
    `--profile=${PROFILE_DIR}`,
  ];

  if (!headless) {
    args.push("--headed");
  }

  try {
    await execCommand("playwright-cli", args);
  } catch {}

  await new Promise(r => setTimeout(r, 2000));
}

export async function readLocalStorage(key: string): Promise<string | null> {
  try {
    const output = await execCommand("playwright-cli", [
      `-s=${SESSION_NAME}`,
      "localstorage-get",
      key,
    ]);

    const lines = output.split("\n");
    let resultValue: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.includes("### Result")) {
        resultValue = lines[i + 1]?.trim() || null;
        break;
      }
    }

    if (
      !resultValue ||
      resultValue.includes("localStorage key") ||
      resultValue.includes("Error:") ||
      resultValue.includes("not found") ||
      resultValue === "null" ||
      resultValue.length < 20
    ) {
      return null;
    }

    if (resultValue.startsWith(`${key}=`)) {
      resultValue = resultValue.slice(key.length + 1);
    }

    return resultValue;
  } catch {
    return null;
  }
}

export async function closeBrowser(): Promise<void> {
  try {
    await execCommand("playwright-cli", [`-s=${SESSION_NAME}`, "close"]);
  } catch {}
}

export async function fetchTokenFromBrowser(headless: boolean = true): Promise<string | null> {
  try {
    if (!(await isBrowserRunning())) {
      await openBrowser(headless);
    }

    let token = await readLocalStorage("access_token");

    if (token) {
      return token;
    }

    await new Promise(r => setTimeout(r, 2000));
    token = await readLocalStorage("access_token");

    return token;
  } catch (error) {
    console.error("Failed to fetch token from browser:", error);
    return null;
  }
}
