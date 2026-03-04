import { getUserPreferences, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export async function whoami(options: { json?: boolean } = {}) {
  if (!(await isAuthenticated())) {
    if (options.json) {
      console.log(JSON.stringify({ authenticated: false }, null, 2));
      return;
    }
    logger.warn("Not authenticated. Run 'lilys auth' first.");
    return;
  }

  try {
    const userInfo = await getUserPreferences();
    const email = userInfo.user?.email || userInfo.email || "unknown";
    const uid = userInfo.user?.uid || userInfo.uid || "unknown";
    const plan = userInfo.user?.planType || userInfo.planType || "free";
    const resultLanguage = userInfo.userPreference?.resultLanguage || "not set";

    if (options.json) {
      console.log(JSON.stringify({ authenticated: true, email, uid, plan, resultLanguage }, null, 2));
      return;
    }

    logger.success("Authenticated");
    logger.log(`${styles.label("Email:")} ${styles.value(email)}`);
    logger.log(`${styles.label("UID:")} ${styles.value(uid)}`);
    logger.log(`${styles.label("Plan:")} ${styles.value(plan)}`);
    logger.log(`${styles.label("Language:")} ${styles.value(resultLanguage)}`);
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      process.exit(1);
    }
    if (options.json) {
      console.log(JSON.stringify({ authenticated: true }, null, 2));
      return;
    }
    logger.success("Authenticated");
  }
}
