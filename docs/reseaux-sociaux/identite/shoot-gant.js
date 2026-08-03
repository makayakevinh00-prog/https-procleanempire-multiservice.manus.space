const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
  await p.goto("file://" + path.join(__dirname, "gant.html"));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1000);
  const el = await p.$(".sheet");
  await el.screenshot({ path: path.join(__dirname, "out-gant", "00-gant-blanc-identite.png") });
  console.log("ok");
  await b.close();
})();
