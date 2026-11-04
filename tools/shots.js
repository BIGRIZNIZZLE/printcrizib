// iPhone-sized screenshots (390x844 @3x) in light + dark. Uses a throwaway browser profile; sample spools exist only in that profile.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/printcrizib/';
const OUT = __dirname + '/../screenshots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sample = [
  ['PLA Basic', 'PLA', 'Jade White', '#f2f3ee', 1000, 640, 12.99], ['PLA Basic', 'PLA', 'Black', '#161616', 1000, 910, 12.99],
  ['PETG HF', 'PETG', 'Cobalt Blue', '#2f63c9', 1000, 150, 16.99], ['PLA-CF', 'PLA-CF', 'Charcoal', '#3a3d42', 1000, 1000, 24.99],
  ['PAHT-CF', 'PAHT-CF', 'Black', '#202020', 1000, 780, 59.99], ['PLA Metal', 'PLA', 'Iron Gray Metallic', '#8b9097', 1000, 420, 22.99],
];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'networkidle0' }); await sleep(500);
    await p.evaluate(rows => {
      const db = PrintCrizibApp.getDb(); const t = new Date().toISOString();
      rows.forEach((r, i) => db.items.push(PrintCrizibApp.normalize({ id: 'shot' + i, cat: 'filament', brand: 'Bambu Lab', name: r[0], material: r[1], color: r[2], colorHex: r[3], spoolG: r[4], remainG: r[5], listPrice: r[6], paid: r[6], vendor: 'Bambu Lab US store', orderDate: '2026-11-03', ams: !/CF/.test(r[1]) || r[1] === 'PLA-CF', created: t, updated: t })));
      PrintCrizibApp.replaceDb(db);
    }, sample);
    await p.evaluate(() => { location.hash = '#/dash'; window.scrollTo(0, 0); }); await sleep(600);
    await p.screenshot({ path: OUT + `dashboard-${scheme}.png` });
    await p.evaluate(() => { location.hash = '#/filament'; window.scrollTo(0, 0); }); await sleep(600);
    await p.screenshot({ path: OUT + `filament-${scheme}.png` });
    await p.evaluate(() => { location.hash = '#/inv'; }); await sleep(300);
    await p.evaluate(() => document.getElementById('fab').click()); await sleep(900);
    await p.evaluate(() => document.querySelector('[data-pk="accessory"]').click()); await sleep(300);
    await p.screenshot({ path: OUT + `add-picker-${scheme}.png` });
    await p.evaluate(() => [...document.querySelectorAll('#picker .prow')].find(x => /AMS 2 Pro/.test(x.textContent)).click()); await sleep(700);
    await p.evaluate(() => { const f = document.getElementById('sheetForm'); f.elements.listPrice.value = '349'; f.elements.listPrice.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(200); await p.screenshot({ path: OUT + `add-purchase-${scheme}.png` });
    await p.keyboard.press('Escape'); await sleep(300);
    await p.evaluate(() => { location.hash = '#/item/starter-p2s-combo'; window.scrollTo(0, 0); }); await sleep(500);
    await p.screenshot({ path: OUT + `item-p2s-${scheme}.png` });
    await p.evaluate(() => { location.hash = '#/guide'; window.scrollTo(0, 0); }); await sleep(500);
    await p.screenshot({ path: OUT + `guide-${scheme}.png` });
    await p.goto(BASE + 'join/', { waitUntil: 'networkidle0' }); await sleep(400);
    await p.screenshot({ path: OUT + `join-${scheme}.png` });
    if (scheme === 'dark') { await p.evaluate(() => sessionStorage.clear()); await p.goto(BASE + '#/dash', { waitUntil: 'networkidle0' }); await sleep(1200); await p.screenshot({ path: OUT + 'splash.png' }); }
    console.log(scheme, 'errors:', JSON.stringify(errs)); await ctx.close();
  }
  await b.close();
})();
