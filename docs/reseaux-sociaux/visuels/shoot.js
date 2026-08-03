const { chromium } = require("playwright");
const path = require("path");
const DIR = __dirname;
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(DIR, "visuels.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const shots = [
    ["#v1", "01-lundi-bureau-propre-1080x1350.png"],
    ["#v2", "02-mercredi-le-saviez-vous-1080x1080.png"],
    ["#v3", "03-vendredi-avis-google-1080x1350.png"],
    ["#v4", "04-mardi-avant-apres-cuir-1080x1350.png"]
  ];
  for (const [sel, file] of shots) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(DIR, "out", file) });
    console.log("ok " + file);
  }
  await browser.close();
})();
