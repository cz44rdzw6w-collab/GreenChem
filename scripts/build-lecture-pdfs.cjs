// Дәрістердің PDF нұсқаларын жасау: public/course/pdf/<id>.pdf
// Қолдану: 1) npm start (немесе PORT=3100 node server.js)  2) node scripts/build-lecture-pdfs.cjs [http://localhost:3000/]
// Дәріс мәтіні (public/course/*.html) өзгерген сайын қайта іске қосыңыз.
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://localhost:3000/";
const OUT = path.join(__dirname, "..", "public", "course", "pdf");

(async () => {
  const { COURSE_LECTURES } = await import(path.join(__dirname, "..", "public", "js", "data", "course-lectures.js"));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  for (const l of COURSE_LECTURES.filter((x) => x.ready)) {
    await page.goto(`${BASE}#/lectures/${l.id}`, { waitUntil: "networkidle" });
    await page.waitForSelector("#lecBody details.qa");
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: path.join(OUT, `${l.id}.pdf`),
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px;width:100%;padding:0 12mm;color:#777;font-family:sans-serif">GreenChemAI · «Жасыл химияға кіріспе» · ${l.n}-тақырып (${l.hours})</div>`,
      footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#777;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      margin: { top: "16mm", bottom: "14mm", left: "12mm", right: "12mm" },
    });
    await page.emulateMedia({ media: "screen" });
    console.log(`✓ ${l.id}.pdf`);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
