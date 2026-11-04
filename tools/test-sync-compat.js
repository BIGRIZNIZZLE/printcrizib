// Offline compatibility check: Print Crizib records pass through every AutoLog sync.js ever shipped (GitHub history + current)
// and come back unchanged; AutoLog never drops them (so never tombstones them); Print Crizib ignores AutoLog's and Tool Crizib's rows,
// and Tool Crizib ignores Print Crizib's rows.
const fs = require('fs'), vm = require('vm');
function load(file, hookFrom, hookTo) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes(hookFrom)) throw new Error('no hook in ' + file);
  src = src.replace(hookFrom, hookTo);
  const store = {}; const ls = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const app = { getDb: () => ({}), replaceDb() {}, onChange() {}, toast() {}, render() {} };
  const window = { AutoLogApp: app, ToolLogApp: app, PrintCrizibApp: app, addEventListener() {}, location: { origin: 'x', href: 'x' }, AUTOLOG_STANDALONE: true };
  const ctx = { window, localStorage: ls, sessionStorage: ls, document: { querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, getElementById: () => null, visibilityState: 'visible' }, navigator: { onLine: true }, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, Map, Set, Promise, fetch: async () => { throw new Error('offline'); } };
  ctx.location = { hash: '', origin: 'x', href: 'x', search: '', pathname: '/' }; ctx.history = { replaceState() {} }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
  return { ...window.__T, store };
}
const TL = load(__dirname + '/../sync.js', 'window.PrintCrizibSync = {', 'window.__T = { explode, implode }; window.PrintCrizibSync = {');
const TC = load('/workspace/toollog/sync.js', 'window.ToolLogSync = {', 'window.__T = { explode, implode }; window.ToolLogSync = {');
const tdb = { version: 1, settings: { theme: 'dark' },
  items: [{ id: 'starter-p2s-combo', seed: 1, cat: 'printer', brand: 'Bambu Lab', name: 'P2S-2767 Combo', listPrice: 649, coupon: null, ppUntil: '2026-12-03', photos: ['p1'], created: '2026-11-04T00:00:00.000Z', updated: '2026-11-04T00:00:00.000Z' }, { id: 'i2', cat: 'filament', brand: 'Bambu Lab', name: 'PLA Basic', material: 'PLA', colorHex: '#000000', spoolG: 1000, remainG: 640, paid: 12.99 }],
  prints: [{ id: 'p1', name: 'Bracket', spoolId: 'i2', grams: 120 }], custom: [{ id: 'c1', c: 'tools', b: 'Generic', n: 'Deburring tool' }] };
const tcdb = { version: 1, settings: {}, items: [{ id: 't1', kind: 'tool', brand: 'Milwaukee', model: 'TC-ONLY-2767', name: 'Impact' }], kits: [{ id: 'k1', name: 'Kit' }], custom: [] };
const tc = TC.explode(tcdb);
const tl = TL.explode(tdb);
const res = {}; const ok = (k, c, extra = '') => { res[k] = c ? 'PASS' : 'FAIL ' + extra; };
ok('printcrizibKeys', [...tl.keys()].every(k => k.startsWith('maint/pc:')) && tl.size === 4 && [...tl.values()].every(r => r.kind === 'maint' && r.data._vid === '__printcrizib' && r.id.length <= 100), JSON.stringify([...tl.keys()]));
{ const both = new Map([...tc, ...tl]);
  const tcBack = TC.implode({ version: 1, items: [], kits: [], custom: [], settings: {} }, both);
  ok('Tool Crizib ignores Print Crizib rows', tcBack.items.length === 1 && tcBack.items[0].id === 't1' && tcBack.kits.length === 1 && !JSON.stringify(tcBack).includes('P2S'));
  const pcBack = TL.implode({ version: 1, items: [], prints: [], custom: [], settings: {} }, both);
  ok('Print Crizib ignores Tool Crizib rows', pcBack.items.length === 2 && !JSON.stringify(pcBack).includes('TC-ONLY'));
  const tcRe = TC.explode(TC.implode(tcBack, both)); ok('Tool Crizib never tombstones pc: rows (not in its key space)', ![...tcRe.keys()].some(k => k.startsWith('maint/pc:'))); }
// an AutoLog account's own records
const adb = { version: 10, settings: {}, programs: [{ id: 'pg1' }], vehicles: [{ id: 'v1', name: 'Car', fuel: [{ id: 'f1', gallons: 10 }], maint: { oil: [{ id: 'm1', odo: 5 }] } }], parts: [{ id: 'p1' }], plans: [], inventory: [{ id: 'n1', qty: 2 }], vlib: [] };
const versions = fs.readdirSync('/tmp/alsync').filter(f => f.endsWith('.js'));
for (const f of versions) {
  const A = load('/tmp/alsync/' + f, 'window.AutoLogSync = {', 'window.__T = { explode, implode }; window.AutoLogSync = {');
  const aRecs = A.explode(adb);
  const byId = a => JSON.stringify([...a].sort((x, y) => String(x.id).localeCompare(String(y.id))));
  const all = new Map([...aRecs, ...tc, ...tl]);            // what the server holds for this user
  const aLocal = A.implode({ ...adb, vehicles: [], programs: [] }, all);  // AutoLog pulls everything
  const aRe = A.explode(aLocal);                     // AutoLog's live set (anything missing would be tombstoned)
  const lost = [...tl.keys()].filter(k => !aRe.has(k) || JSON.stringify(aRe.get(k).data) !== JSON.stringify(tl.get(k).data));
  ok(f + ': AutoLog keeps every Print Crizib record unchanged', lost.length === 0, lost.join(','));
  ok(f + ': AutoLog data intact', JSON.stringify(aLocal.vehicles) === JSON.stringify(adb.vehicles) && aLocal.vehicles[0].maint.oil.length === 1 && !aLocal.vehicles.some(v => v.maint && v.maint.items));
  const leaked = JSON.stringify(aLocal.vehicles).includes('P2S-2767') || JSON.stringify(aLocal.inventory || []).includes('P2S-2767') || JSON.stringify(aLocal.parts || []).includes('P2S-2767');
  ok(f + ': Print Crizib items not shown in AutoLog', !leaked);
  // and ToolLog reading the same server set sees only its own records
  const back = TL.implode({ version: 1, items: [], prints: [], custom: [], settings: tdb.settings }, all);
  ok(f + ': Print Crizib round trip / ignores AutoLog rows', byId(back.items) === byId(tdb.items) && JSON.stringify(back.prints) === JSON.stringify(tdb.prints) && JSON.stringify(back.custom) === JSON.stringify(tdb.custom) && !back.vehicles && !back.kits);
  // AutoLog after a reload (orphans persisted to its own storage) still has them
  const aRe2 = A.explode(A.implode(aLocal, aRe));
  ok(f + ': survives a second AutoLog cycle', [...tl.keys()].every(k => aRe2.has(k)));
}
console.log(JSON.stringify(res, null, 1));
const fails = Object.values(res).filter(x => x !== 'PASS').length; console.log(fails ? fails + ' FAIL' : 'ALL PASS (' + versions.length + ' AutoLog versions)'); process.exit(fails ? 1 : 0);
