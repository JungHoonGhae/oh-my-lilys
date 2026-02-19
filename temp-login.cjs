const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto("https://lilys.ai/en/signup");
  await page.waitForLoadState("networkidle");
  
  console.log("Browser opened at lilys.ai signup page.");
  console.log("Please log in and complete 2FA. Let me know when done.");
  
  await new Promise(() => {});
})();
