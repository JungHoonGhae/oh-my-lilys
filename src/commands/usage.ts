import { getUsageInfo, getPaymentInfo, AuthError } from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

export async function usage(options: { json?: boolean } = {}) {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }

  logger.info("Fetching usage info...");

  try {
    const [usageData, paymentData] = await Promise.allSettled([
      getUsageInfo(),
      getPaymentInfo(),
    ]);

    const usageResult = usageData.status === "fulfilled" ? usageData.value : null;
    const paymentResult = paymentData.status === "fulfilled" ? paymentData.value : null;

    if (options.json) {
      console.log(JSON.stringify({ usage: usageResult, payment: paymentResult }, null, 2));
      return;
    }

    logger.break();
    logger.log(logger.bold("=== Usage Info ==="));
    logger.break();

    if (paymentResult) {
      const plan = paymentResult.planType || paymentResult.plan || paymentResult.type || "unknown";
      logger.log(`${styles.label("Plan:")} ${styles.value(plan)}`);
      if (paymentResult.expiryDate) {
        logger.log(`${styles.label("Expires:")} ${styles.value(paymentResult.expiryDate)}`);
      }
    }

    if (usageResult) {
      // Display all available usage fields dynamically
      const keys = Object.keys(usageResult).filter(k => typeof usageResult[k] !== "object");
      for (const key of keys) {
        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase());
        logger.log(`${styles.label(`${label}:`)} ${styles.value(String(usageResult[key]))}`);
      }

      // Display nested usage objects if present
      for (const key of Object.keys(usageResult)) {
        if (typeof usageResult[key] === "object" && usageResult[key] !== null) {
          logger.break();
          logger.log(logger.bold(`  ${key}:`));
          const nested = usageResult[key];
          for (const nk of Object.keys(nested)) {
            logger.dim(`    ${nk}: ${nested[nk]}`);
          }
        }
      }
    }

    if (!usageResult && !paymentResult) {
      logger.warn("Could not fetch usage information.");
    }

    logger.break();
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      logger.dim("Run 'lilys login' to re-authenticate.");
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
