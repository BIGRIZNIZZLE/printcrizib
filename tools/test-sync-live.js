// Live sync test against the shared Supabase project with throwaway users (deleted at the end).
// Print Crizib + AutoLog on the same origin and account: pc: rows are namespaced, AutoLog keeps them, nobody deletes the other's data;
// a second device gets the data with exactly one starter item; a deleted starter never comes back on a fresh device.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const A = require('/workspace/autolog/tools/sbadmin');
const ORIGIN = process.env.ORIGIN || 'http://127.0.0.1:8813';
const PC = ORIGIN + '/printcrizib/index.html', AL = ORIGIN + '/autolog/index.html';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept-profile, content-profile, prefer', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r = {}, errors = [], users = [];
const check = (n, c, x) => { r[n] = c ? 'PASS' : 'FAIL' + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : ''); };
async function signIn(p, email, api, hash) {
  await p.goto(p.url().split('#')[0] + hash); await sleep(400);
  await p.setRequestInterception(true); let otp = null;
  const h = q => { if (q.url().includes('/auth/v1/otp')) { if (q.method() === 'OPTIONS') return q.respond({ status: 204, headers: CORS, body: '' }); otp = { ...JSON.parse(q.postData() || '{}'), url: q.url() }; q.respond({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' }); } else q.continue(); };
  p.on('request', h);
  await p.waitForSelector('[name="syncEmail"]', { timeout: 10000 }); await p.type('[name="syncEmail"]', email);
  await p.$eval('[data-sync-form="email"] button[type=submit]', e => e.click());
  await p.waitForSelector('[name="syncCode"]', { timeout: 15000 });
  p.off('request', h); await p.setRequestInterception(false);
  const link = await A.genLink(email); await p.type('[name="syncCode"]', link.email_otp || link.properties.email_otp);
  await p.$eval('[data-sync-form="code"] button[type=submit]', e => e.click());
  await waitIdle(p, api, 30000); return otp;
}
const waitIdle = async (p, api, ms = 20000) => { await p.waitForFunction(api => { const s = window[api].status(); return s.signedIn && s.state === 'idle' && s.pending === 0; }, { timeout: ms, polling: 250 }, api); await sleep(300); };
const syncNow = async (p, api) => { await p.evaluate(api => window[api].sync(), api); await sleep(300); await waitIdle(p, api); };
const rows = async uid => A.sql(`select kind, id, deleted, data->>'_vid' vid from public.records where user_id='${uid}' order by kind, id`);
async function newPage(ctx, label, url) {
  const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true });
  p.on('console', m => { if (m.type() === 'error') errors.push(`[${label}] ${m.text()}`); }); p.on('pageerror', e => errors.push(`[${label} pageerror] ${e.message}`));
  await p.goto(url + '?nosplash', { waitUntil: 'networkidle0' }); await sleep(300); return p;
}
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const u = await A.createUser(`printcrizib-test-${Date.now()}@test.invalid`); users.push(u);
  const ctx = await b.createBrowserContext();
  const pa = await newPage(ctx, 'AutoLog', AL);
  await pa.$eval('[data-act="loadSample"]', e => e.click()); await sleep(400);
  const alBefore = await pa.evaluate(() => JSON.stringify(window.AutoLogApp.getDb().vehicles));
  await signIn(pa, u.email, 'AutoLogSync', '#/garage');
  const r0 = await rows(u.id); const alRows = r0.filter(x => !x.deleted).length;
  check('AutoLog pushed its rows', alRows > 5 && !r0.some(x => String(x.id).startsWith('pc:')), alRows);
  const pt = await newPage(ctx, 'PrintCrizib', PC);
  check('Print Crizib not signed in by AutoLog session', !(await pt.evaluate(() => window.PrintCrizibSync.status().signedIn)));
  check('fresh install has the starter', (await pt.evaluate(() => window.PrintCrizibApp.getDb().items.map(i => i.id))).join() === 'starter-p2s-combo');
  await pt.evaluate(() => { const d = window.PrintCrizibApp.getDb(); const t = new Date().toISOString();
    d.items.push({ id: 'sp1', cat: 'filament', brand: 'Bambu Lab', name: 'PLA Basic', material: 'PLA', color: 'Black', colorHex: '#111111', spoolG: 1000, remainG: 1000, paid: 12.99, created: t, updated: t });
    d.items.push({ id: 'sp2', cat: 'filament', brand: 'Bambu Lab', name: 'PETG HF', material: 'PETG', color: 'Blue', spoolG: 1000, remainG: 700, paid: 16.99, created: t, updated: t });
    d.prints.push({ id: 'pr1', name: 'Bracket', spoolId: 'sp1', grams: 50, created: t, updated: t }); d.custom.push({ id: 'c1', c: 'tools', b: 'Generic', n: 'Deburring tool', created: t });
    window.PrintCrizibApp.replaceDb(window.PrintCrizibApp.normalize(d)); });
  const n = async q => q.evaluate(() => { const d = window.PrintCrizibApp.getDb(); return d.items.length + d.prints.length + d.custom.length; });
  const pcN = await n(pt);
  const otp = await signIn(pt, u.email, 'PrintCrizibSync', '#/more');
  check('OTP request: email + emailRedirectTo is /printcrizib/', otp && otp.email === u.email && /[?&]redirect_to=https?%3A%2F%2F[^&]*%2Fprintcrizib%2F/.test(otp.url), otp && decodeURIComponent(otp.url));
  const r1 = await rows(u.id); const pcRows = r1.filter(x => String(x.id).startsWith('pc:'));
  check('Print Crizib pushed namespaced rows', pcRows.length === pcN && pcRows.every(x => x.kind === 'maint' && x.vid === '__printcrizib' && !x.deleted), { pcN, got: pcRows });
  check('AutoLog rows untouched by Print Crizib', r1.filter(x => !String(x.id).startsWith('pc:') && !x.deleted).length === alRows);
  await pa.bringToFront(); await pa.reload({ waitUntil: 'networkidle0' }); await sleep(500); await syncNow(pa, 'AutoLogSync');
  check('AutoLog garage unchanged after pulling pc: rows', (await pa.evaluate(() => JSON.stringify(window.AutoLogApp.getDb().vehicles))) === alBefore);
  const orph = await pa.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('autolog:sync:orphans') || '{}')).filter(k => k.startsWith('maint/pc:')).length);
  check('AutoLog keeps Print Crizib rows as orphans', orph === pcN, orph);
  check('no pc: row deleted by AutoLog', (await rows(u.id)).filter(x => String(x.id).startsWith('pc:') && !x.deleted).length === pcN);
  // edit + delete on device 1
  await pt.bringToFront();
  await pt.evaluate(() => { const d = JSON.parse(JSON.stringify(window.PrintCrizibApp.getDb())); d.items = d.items.filter(i => i.id !== 'sp2'); const s = d.items.find(i => i.id === 'sp1'); s.remainG = 433; s.updated = new Date().toISOString(); window.PrintCrizibApp.replaceDb(d); window.PrintCrizibSync.changed(); });
  await sleep(2500); await waitIdle(pt, 'PrintCrizibSync');
  check('delete = tombstone', (await rows(u.id)).some(x => x.id === 'pc:item:sp2' && x.deleted));
  // device 2: fresh install (its own starter) signs in
  const ctx2 = await b.createBrowserContext(); const p2 = await newPage(ctx2, 'PrintCrizib-2', PC);
  await signIn(p2, u.email, 'PrintCrizibSync', '#/more');
  const d2 = await p2.evaluate(() => { const d = window.PrintCrizibApp.getDb(); return { ids: d.items.map(i => i.id).sort(), remain: (d.items.find(i => i.id === 'sp1') || {}).remainG, prints: d.prints.length, custom: d.custom.length, vehicles: 'vehicles' in d }; });
  check('device 2: data arrives, one starter, edit applied, no AutoLog data', d2.ids.join() === 'sp1,starter-p2s-combo' && d2.remain === 433 && d2.prints === 1 && d2.custom === 1 && !d2.vehicles, d2);
  check('server: exactly one starter row', (await rows(u.id)).filter(x => x.id === 'pc:item:starter-p2s-combo').length === 1);
  // device 1 deletes the starter; a fresh device 3 must not resurrect it
  await pt.bringToFront();
  await pt.evaluate(() => { const d = JSON.parse(JSON.stringify(window.PrintCrizibApp.getDb())); d.items = d.items.filter(i => i.id !== 'starter-p2s-combo'); window.PrintCrizibApp.replaceDb(d); window.PrintCrizibSync.changed(); });
  await sleep(2500); await waitIdle(pt, 'PrintCrizibSync');
  const ctx3 = await b.createBrowserContext(); const p3 = await newPage(ctx3, 'PrintCrizib-3', PC);
  check('device 3 fresh install starts with starter', (await p3.evaluate(() => window.PrintCrizibApp.getDb().items.length)) === 1);
  await signIn(p3, u.email, 'PrintCrizibSync', '#/more'); await syncNow(p3, 'PrintCrizibSync');
  const d3 = await p3.evaluate(() => window.PrintCrizibApp.getDb().items.map(i => i.id).join());
  check('deleted starter not resurrected by a fresh device', d3 === 'sp1', d3);
  check('server: starter stays a tombstone', (await rows(u.id)).some(x => x.id === 'pc:item:starter-p2s-combo' && x.deleted));
  await pa.bringToFront(); await syncNow(pa, 'AutoLogSync');
  check('AutoLog still fine at the end', (await pa.evaluate(() => JSON.stringify(window.AutoLogApp.getDb().vehicles))) === alBefore);
  const r4 = await rows(u.id);
  check('final: AutoLog rows intact', r4.filter(x => !String(x.id).startsWith('pc:') && !x.deleted).length === alRows);
  r.counts = { autologRows: alRows, printcrizibRows: pcN };
  r.errors = errors.filter(e => !/Failed to load resource/.test(e));
  await b.close();
})().catch(e => { r.fatal = String(e && e.stack || e); }).finally(async () => {
  for (const x of users) { try { await A.deleteUser(x.id); } catch (e) { r['cleanup ' + x.email] = e.message; } }
  try { const left = await A.sql(`select count(*)::int n from public.records where user_id in (${users.map(x => `'${x.id}'`).join(',') || 'null'})`); r.rowsLeftAfterCleanup = left[0].n; const au = await A.sql(`select count(*)::int n from auth.users where email like 'printcrizib-test-%@test.invalid'`); r.testUsersLeft = au[0].n; } catch (e) { r.cleanupCheck = e.message; }
  console.log(JSON.stringify(r, null, 1)); process.exit(0);
});
