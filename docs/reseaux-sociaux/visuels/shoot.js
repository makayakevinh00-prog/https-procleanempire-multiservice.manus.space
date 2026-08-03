const { chromium } = require("playwright");
const path = require("path");
const DIR = __dirname;
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(DIR, "visuels.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const shots = [
    ["#v1",  "01-lundi-08h-bureau-propre-1080x1350.png"],
    ["#v4",  "02-mardi-08h-avant-apres-cuir-1080x1350.png"],
    ["#v2",  "03-mercredi-08h-le-saviez-vous-1080x1080.png"],
    ["#v5",  "04-mercredi-12h-30-secondes-1080x1080.png"],
    ["#v6",  "05-jeudi-08h-vitrerie-1080x1350.png"],
    ["#v7",  "06-jeudi-12h-une-matiere-un-protocole-1080x1080.png"],
    ["#v3",  "07-vendredi-08h-avis-google-1080x1350.png"],
    ["#v8",  "08-samedi-08h-detailing-auto-1080x1350.png"],
    ["#v9",  "09-samedi-aeronautique-1080x1350.png"],
    ["#v10", "10-dimanche-08h-fondateur-1080x1350.png"]
  ];
  for (const [sel, file] of shots) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(DIR, "out", file) });
    console.log("ok " + file);
  }
  await browser.close();
})();
