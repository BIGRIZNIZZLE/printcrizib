// Migrations: unversioned/older data is backed up before upgrade and normalized without losing fields; corrupt JSON is kept;
// the starter item seeds only on a truly fresh install, never twice, and never after the user deleted it.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/printcrizib/';
const sleep = ms => new Promise(r => setTimeout(r, ms)); const r = {};
const ok = (k, c, x) => { r[k] = c ? 'PASS' : 'FAIL ' + JSON.stringify(x); };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const fresh = async (set) => { await p.goto(BASE + '?nosplash', { waitUntil: 'networkidle0' }); await p.evaluate(set => { localStorage.clear(); for (const [k, v] of Object.entries(set)) localStorage.setItem(k, v); }, set); await p.reload({ waitUntil: 'networkidle0' }); await sleep(300); };
  // 1. old unversioned shape
  const old = { items: [{ id: 'a', cat: 'spool', brand: 'Polymaker', name: 'PolyLite PLA', material: 'PLA', paid: 21.5, extraField: 'keep me' }, { id: 'b', cat: 'weird', name: 'Mystery part' }, { name: 'no id' }], prints: [{ id: 'p', name: 'Benchy', grams: 12 }], settings: { theme: 'dark' } };
  await fresh({ 'printcrizib:data:v1': JSON.stringify(old) });
  const d = await p.evaluate(() => PrintCrizibApp.getDb());
  ok('backup of pre-upgrade data', (await p.evaluate(() => localStorage.getItem('printcrizib:backup:v1:pre-v1'))) === JSON.stringify(old));
  ok('version stamped', d.version === 1, d.version);
  ok('fields kept (unknown field, paid, theme)', d.items[0].extraField === 'keep me' && d.items[0].paid === 21.5 && d.settings.theme === 'dark' && d.settings.lowG === 200, d.items[0]);
  ok('spool->filament, defaults filled', d.items[0].cat === 'filament' && d.items[0].spoolG === 1000 && d.items[0].remainG === 1000 && d.items[0].ams === true, d.items[0]);
  ok('unknown category -> parts, id-less row dropped', d.items[1].cat === 'parts' && d.items.length === 2, d.items.map(i => i.cat));
  ok('no starter seed on an existing install', !d.items.some(i => i.id === 'starter-p2s-combo'));
  ok('print kept + defaulted', d.prints[0].name === 'Benchy' && d.prints[0].result === 'Success');
  // 2. current-version data is not re-backed-up
  await p.evaluate(() => localStorage.removeItem('printcrizib:backup:v1:pre-v1')); await p.reload({ waitUntil: 'networkidle0' });
  ok('current data: no extra backup', !(await p.evaluate(() => localStorage.getItem('printcrizib:backup:v1:pre-v1'))));
  // 3. corrupt JSON preserved
  await fresh({ 'printcrizib:data:v1': '{not json' });
  ok('corrupt JSON preserved in backup', (await p.evaluate(() => localStorage.getItem('printcrizib:backup:v1:corrupt'))) === '{not json');
  // 4. fresh install seeds once; deleting it sticks
  await fresh({});
  ok('fresh install seeds starter', (await p.evaluate(() => PrintCrizibApp.getDb().items.filter(i => i.id === 'starter-p2s-combo').length)) === 1);
  await p.reload({ waitUntil: 'networkidle0' });
  ok('reload does not duplicate', (await p.evaluate(() => PrintCrizibApp.getDb().items.length)) === 1);
  await p.evaluate(() => { const db = PrintCrizibApp.getDb(); db.items = []; PrintCrizibApp.replaceDb(db); }); await p.reload({ waitUntil: 'networkidle0' });
  ok('deleted starter does not come back', (await p.evaluate(() => PrintCrizibApp.getDb().items.length)) === 0);
  // 5. Tool Crizib / AutoLog data on the same origin untouched
  await fresh({ 'toollog:data:v1': '{"version":3,"items":[{"id":"t"}]}', 'autolog:data': '{"version":10}' });
  ok('other apps\' storage untouched', (await p.evaluate(() => localStorage.getItem('toollog:data:v1') + localStorage.getItem('autolog:data'))) === '{"version":3,"items":[{"id":"t"}]}{"version":10}');
  r.errors = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
