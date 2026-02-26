import { getResultLanguage, setResultLanguage } from "../utils/config.js";
import { getUserPreferences, updateUserPreferences } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export async function showLanguage() {
  const stored = getResultLanguage();
  logger.log(`${logger.bold("Current AI Result Language:")} ${styles.value(stored)}`);

  if (await isAuthenticated()) {
    try {
      const prefs = await getUserPreferences();
      const resultLang = prefs.userPreference?.resultLanguage;
      logger.log(`${logger.bold("Server setting:")} ${resultLang || styles.dim("(not set)")}`);
    } catch {
      // ignore
    }
  }
}

export async function setResultLanguageCmd(lang: string) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info(`Updating AI Result Language to: ${styles.value(lang)}...`);
  
  try {
    await updateUserPreferences({ resultLanguage: lang });
    setResultLanguage(lang);
    logger.success("Successfully updated!");
  } catch (error) {
    logger.error("Error updating preference:", error instanceof Error ? error.message : error);
    logger.break();
    logger.dim("Falling back to local storage only...");
    setResultLanguage(lang);
  }
}
