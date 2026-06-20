import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];

page.on("console", (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) =>
  logs.push(`[reqfailed] ${r.url()} :: ${r.failure()?.errorText}`)
);
page.on("response", (r) => {
  if (r.url().includes("/api/")) logs.push(`[resp ${r.status()}] ${r.url()}`);
});

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "dev@devflow.app");
await page.fill('input[type="password"]', "demo-ee38d6d4");
logs.push(`URL antes de Ingresar: ${page.url()}`);
await page.click('button:has-text("Ingresar")');
await page.waitForTimeout(5000);
logs.push(`URL FINAL: ${page.url()}`);

const cookies = await page.context().cookies();
logs.push("COOKIES: " + cookies.map((c) => c.name).join(", "));

console.log(logs.join("\n"));
await browser.close();
