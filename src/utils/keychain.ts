import { platform } from "os";

const SERVICE_NAME = "oh-my-lilys";
const ACCOUNT_NAME = "lilys-token";

function execCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn([cmd, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    proc.exited.then(async (code) => {
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });
  });
}

export function isKeychainSupported(): boolean {
  return platform() === "darwin";
}

export async function saveToKeychain(token: string): Promise<boolean> {
  if (!isKeychainSupported()) return false;

  try {
    // Delete existing entry first (ignore errors if not found)
    try {
      await execCommand("security", [
        "delete-generic-password",
        "-s", SERVICE_NAME,
        "-a", ACCOUNT_NAME,
      ]);
    } catch {
      // Entry didn't exist, that's fine
    }

    await execCommand("security", [
      "add-generic-password",
      "-s", SERVICE_NAME,
      "-a", ACCOUNT_NAME,
      "-w", token,
      "-U", // Update if exists
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function getFromKeychain(): Promise<string | null> {
  if (!isKeychainSupported()) return null;

  try {
    const output = await execCommand("security", [
      "find-generic-password",
      "-s", SERVICE_NAME,
      "-a", ACCOUNT_NAME,
      "-w", // Output password only
    ]);
    const token = output.trim();
    return token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export async function deleteFromKeychain(): Promise<boolean> {
  if (!isKeychainSupported()) return false;

  try {
    await execCommand("security", [
      "delete-generic-password",
      "-s", SERVICE_NAME,
      "-a", ACCOUNT_NAME,
    ]);
    return true;
  } catch {
    return false;
  }
}
