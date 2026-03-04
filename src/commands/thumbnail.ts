import {
  requestThumbnail,
  getThumbnailUrl,
  getSessionResources,
  AuthError,
} from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";
import { mkdirSync, existsSync } from "fs";

export interface ThumbnailOptions {
  times?: string;
  output?: string;
  json?: boolean;
}

export async function thumbnail(sessionId: string, options: ThumbnailOptions = {}) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys auth' first.");
    process.exit(1);
  }

  try {
    // 1. Resolve sourceId from session
    logger.info(`Resolving source for session: ${styles.key(sessionId)}`);
    const resources = await getSessionResources(sessionId);
    const resource = resources.find((r: any) => String(r.sessionId) === sessionId) || resources[0];

    if (!resource?.sourceId) {
      logger.error("No source found for this session. Thumbnails require a video source.");
      process.exit(1);
    }

    const sourceId = resource.sourceId;
    const sourceType = resource.sourceType || "youtube_video";
    logger.dim(`Source: ${sourceId} (${sourceType})`);

    // 2. Parse timestamps
    let times: number[];
    if (options.times) {
      times = options.times.split(",").map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
    } else {
      times = [0, 30, 60, 120, 300];
      logger.dim(`Using default timestamps: ${times.join(", ")}s`);
    }

    if (times.length === 0) {
      logger.error("No valid timestamps provided.");
      process.exit(1);
    }

    // 3. Request thumbnails
    logger.info(`Requesting ${times.length} thumbnail(s)...`);
    await requestThumbnail(sourceId, times, sourceType);

    // 4. Wait for S3 processing
    logger.dim("Waiting for frames to be ready...");
    let ready = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      const checkUrl = getThumbnailUrl(sourceId, times[0]!);
      const check = await fetch(checkUrl, { method: "HEAD" });
      if (check.ok) { ready = true; break; }
      logger.dim(`  Waiting... (attempt ${attempt + 2})`);
    }

    if (!ready) {
      logger.warn("Frames may still be processing. Some URLs might not be ready yet.");
    }

    // 5. Build URL list with availability check
    const urls: { timestamp: number; url: string; ready: boolean }[] = [];
    for (const t of times) {
      const url = getThumbnailUrl(sourceId, t);
      const check = await fetch(url, { method: "HEAD" });
      urls.push({ timestamp: t, url, ready: check.ok });
    }

    if (options.json) {
      console.log(JSON.stringify({ sessionId, sourceId, sourceType, thumbnails: urls }, null, 2));
      return;
    }

    // 6. Download if --output specified
    if (options.output) {
      const dir = options.output;
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      let downloaded = 0;
      for (const item of urls) {
        if (!item.ready) {
          logger.dim(`  Skipping ${item.timestamp}s (not ready)`);
          continue;
        }
        const response = await fetch(item.url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const filename = `${dir}/${sourceId}_${item.timestamp}s.jpg`;
          await Bun.write(filename, buffer);
          downloaded++;
          logger.dim(`  Saved: ${filename}`);
        }
      }
      logger.success(`Downloaded ${downloaded}/${urls.length} thumbnail(s) to ${dir}/`);
    } else {
      // Display URLs
      logger.break();
      logger.log(logger.bold("Thumbnails:"));
      logger.break();
      for (const item of urls) {
        const status = item.ready ? styles.success("ready") : styles.dim("pending");
        const min = Math.floor(item.timestamp / 60);
        const sec = item.timestamp % 60;
        const timeStr = `${min}:${String(sec).padStart(2, "0")}`;
        logger.log(`  ${styles.label(timeStr)} [${status}]`);
        logger.log(`    ${styles.url(item.url)}`);
      }
    }
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      logger.dim("Run 'lilys auth' to re-authenticate.");
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
