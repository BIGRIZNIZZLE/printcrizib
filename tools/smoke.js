// Smoke: fresh install seeds the starter item, every route renders without errors, add spool + print flows work.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/printcrizib/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' }); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'networkidle0' }); await sleep(400);
  const r = {};
  r.seed = await p.evaluate(() => { const d = PrintCrizibApp.getDb(); return d.items.map(i => [i.id, i.name, i.listPrice, i.coupon, i.ppUntil, PrintCrizibApp.cost(i)]); });
  r.banner = await p.evaluate(() => !!document.querySelector('.banner.pp') && !!document.querySelector('.starter'));
  for (const h of ['#/inv', '#/filament', '#/guide', '#/prints', '#/more', '#/about', '#/item/starter-p2s-combo', '#/dash']) { await p.evaluate(h => { location.hash = h; }, h); await sleep(200); }
  // add a spool through the form
  await p.evaluate(() => { location.hash = '#/filament'; }); await sleep(250); await p.evaluate(() => document.querySelector('[data-act="addSpool"]').click()); await sleep(800);
  r.pickerRows = await p.evaluate(() => document.querySelectorAll('#picker .prow').length);
  await p.evaluate(() => [...document.querySelectorAll('#picker .prow')].find(x => /PETG HF/.test(x.textContent)).click()); await sleep(500);
  await p.evaluate(() => { const f = document.getElementById('sheetForm'); f.elements.color.value = 'Black'; f.elements.listPrice.value = '19.99'; f.elements.listPrice.dispatchEvent(new Event('input', { bubbles: true })); f.elements.coupon.value = '3'; f.elements.coupon.dispatchEvent(new Event('input', { bubbles: true })); f.elements.spoolsN.value = '2'; });
  r.autoPaid = await p.evaluate(() => document.getElementById('sheetForm').elements.paid.value);
  r.autoPP = await p.evaluate(() => document.getElementById('sheetForm').elements.ppUntil.value);
  await p.evaluate(() => document.querySelector('#sheetForm button[type=submit]').click()); await sleep(500);
  r.spools = await p.evaluate(() => PrintCrizibApp.getDb().items.filter(i => i.cat === 'filament').map(i => [i.name, i.material, i.paid, i.remainG, i.ams, PrintCrizibApp.perKg(i)]));
  // log a print against the first spool
  await p.evaluate(() => { location.hash = '#/prints'; }); await sleep(200);
  await p.evaluate(() => document.querySelector('[data-act="addPrint"]').click()); await sleep(400);
  await p.evaluate(() => { const f = document.getElementById('sheetForm'); f.elements.name.value = 'Bracket'; f.elements.spoolId.selectedIndex = 1; f.elements.grams.value = '120'; f.elements.hours.value = '2.5'; f.querySelector('button[type=submit]').click(); }); await sleep(400);
  r.afterPrint = await p.evaluate(() => PrintCrizibApp.getDb().items.filter(i => i.cat === 'filament').map(i => i.remainG));
  // quick adjust
  const sid = await p.evaluate(() => PrintCrizibApp.getDb().items.find(i => i.cat === 'filament').id);
  await p.evaluate(id => { location.hash = '#/item/' + id; }, sid); await sleep(250);
  await p.evaluate(() => document.querySelector('[data-act="adj"][data-n="-50"]').click()); await sleep(200);
  r.afterAdj = await p.evaluate(id => PrintCrizibApp.getDb().items.find(i => i.id === id).remainG, sid);
  await p.evaluate(() => { location.hash = '#/dash'; }); await sleep(300);
  r.dashCards = await p.evaluate(() => [...document.querySelectorAll('#app h3')].map(h => h.textContent.trim()));
  r.errors = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
