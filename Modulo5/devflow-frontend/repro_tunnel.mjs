import { chromium } from "playwright";

const URL = "https://slashing-entrap-ninja.ngrok-free.dev";
const browser = await chromium.launch();
const context = await browser.newContext({
  extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" },
});
const page = await context.newPage();
const logs = [];

page.on("console", (m) => { if (m.type() === "error") logs.push(`[console.error] ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("response", (r) => {
  if (r.url().includes("/api/")) logs.push(`[resp ${r.status()}] ${r.url().replace(URL, "")}`);
});

await page.goto(URL + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
logs.push(`URL tras cargar la raíz: ${page.url().replace(URL, "")}`);

// Si redirigió a /login, intentamos loguear
if (page.url().includes("/login")) {
  await page.fill('input[type="email"]', "dev@devflow.app");
  await page.fill('input[type="password"]', "demo-ee38d6d4");
  await page.click('button:has-text("Ingresar")');
  await page.waitForTimeout(4000);
}
logs.push(`URL FINAL: ${page.url().replace(URL, "")}`);
const body = (await page.textContent("body")) || "";
logs.push(`¿Sigue en 'Cargando...'? ${body.trim() === "Cargando..." ? "SÍ (pegado)" : "no"}`);

console.log(logs.join("\n"));
await browser.close();
