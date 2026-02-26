/**
 * Extract Firebase refresh token from browser IndexedDB storage.
 * Supports Arc, Chrome, Brave, Edge, Chromium, Vivaldi.
 */

import { homedir, platform } from "os";
import { join } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";

interface BrowserProfile {
  name: string;
  indexedDbPath: string;
}

function getBrowserPaths(): BrowserProfile[] {
  if (platform() !== "darwin") return [];

  const home = homedir();
  const appSupport = join(home, "Library", "Application Support");

  const browsers: { name: string; dir: string; profiles: string[] }[] = [
    { name: "Dia", dir: join(appSupport, "Dia", "User Data"), profiles: ["Default"] },
    { name: "Arc", dir: join(appSupport, "Arc", "User Data"), profiles: ["Default"] },
    { name: "Chrome", dir: join(appSupport, "Google", "Chrome"), profiles: ["Default", "Profile 1", "Profile 2", "Profile 3"] },
    { name: "Brave", dir: join(appSupport, "BraveSoftware", "Brave-Browser"), profiles: ["Default"] },
    { name: "Edge", dir: join(appSupport, "Microsoft Edge"), profiles: ["Default"] },
    { name: "Chromium", dir: join(appSupport, "Chromium"), profiles: ["Default"] },
    { name: "Vivaldi", dir: join(appSupport, "Vivaldi"), profiles: ["Default"] },
  ];

  const results: BrowserProfile[] = [];

  for (const browser of browsers) {
    for (const profile of browser.profiles) {
      const idbDir = join(browser.dir, profile, "IndexedDB", "https_lilys.ai_0.indexeddb.leveldb");
      if (existsSync(idbDir)) {
        results.push({ name: `${browser.name}/${profile}`, indexedDbPath: idbDir });
      }
    }
  }

  return results;
}

function extractRefreshTokenFromLevelDB(dir: string): string | null {
  try {
    const files = readdirSync(dir).filter(f => f.endsWith(".ldb") || f.endsWith(".log"));

    for (const file of files) {
      const data = readFileSync(join(dir, file));

      // Firebase refresh tokens start with "AMf-"
      const amfPattern = Buffer.from("AMf-");
      let searchStart = 0;

      while (true) {
        const idx = data.indexOf(amfPattern, searchStart);
        if (idx === -1) break;

        // Extract printable ASCII characters starting from this position
        const tokenChars: string[] = [];
        for (let i = idx; i < Math.min(idx + 600, data.length); i++) {
          const c = String.fromCharCode(data[i]!);
          if (/[A-Za-z0-9\-_]/.test(c)) {
            tokenChars.push(c);
          } else if (tokenChars.length > 50) {
            break;
          } else {
            // Reset if we haven't collected enough
            break;
          }
        }

        const token = tokenChars.join("");
        if (token.length > 100 && token.startsWith("AMf-")) {
          return token;
        }

        searchStart = idx + 1;
      }
    }
  } catch {
    // ignore file read errors
  }

  return null;
}

export interface ExtractedTokens {
  browser: string;
  refreshToken: string;
}

/**
 * Find and extract Firebase refresh token from all installed browsers.
 */
export function extractRefreshTokenFromBrowsers(): ExtractedTokens | null {
  const browsers = getBrowserPaths();

  for (const browser of browsers) {
    const refreshToken = extractRefreshTokenFromLevelDB(browser.indexedDbPath);
    if (refreshToken) {
      return { browser: browser.name, refreshToken };
    }
  }

  return null;
}
