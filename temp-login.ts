import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto("https://lilys.ai/en/signup?redirect=/digest");
await page.waitForLoadState("networkidle");

console.log("Browser opened. Please log in manually.");
console.log("When logged in and on the dashboard, close the browser.");

await page.waitForURL("**/digest/**", { timeout: 0 });
