// iOS audit (Chromium with iPhone metrics; WebKit host deps unavailable on this box):
// every visible input/select/textarea computes to >=16px (prevents iOS focus zoom); body scroll locks while a sheet is open; dvh used.
const puppeteer = require('/workspace/autolog/tools/node_modules/puppeteer-core');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8813/printcrizib/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
  await p.goto(BASE + '?nosplash#/dash', { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
  const small = []; const check = async tag => { const s = await p.evaluate(() => [...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=file]),select,textarea')].filter(e => e.offsetParent).map(e => [e.name || e.id || e.type, parseFloat(getComputedStyle(e).fontSize)]).filter(x => x[1] < 16)); s.forEach(x => small.push(tag + ':' + x.join('='))); };
  for (const h of ['#/dash', '#/inv', '#/filament', '#/prints', '#/more']) { await p.evaluate(h => location.hash = h, h); await sleep(250); await check(h); }
  await p.evaluate(() => document.getElementById('fab').click()); await sleep(800); await check('picker');
  const lockedPicker = await p.evaluate(() => getComputedStyle(document.body).overflow === 'hidden' || document.documentElement.classList.contains('sheet-open') || document.body.style.position === 'fixed');
  await p.evaluate(() => document.querySelector('[data-own]').click()); await sleep(500); await check('itemForm');
  const locked = await p.evaluate(() => ({ bodyPos: document.body.style.position, overflow: getComputedStyle(document.body).overflow, cls: document.documentElement.className }));
  await p.keyboard.press('Escape'); await sleep(400);
  const unlocked = await p.evaluate(() => ({ bodyPos: document.body.style.position, overflow: getComputedStyle(document.body).overflow, cls: document.documentElement.className }));
  await p.evaluate(() => location.hash = '#/prints'); await sleep(200); await p.evaluate(() => document.querySelector('[data-act="addPrint"]').click()); await sleep(400); await check('printForm');
  const css = fs.readFileSync(__dirname + '/../styles.css', 'utf8');
  console.log(JSON.stringify({ inputsUnder16px: small, lockedPicker, locked, unlocked, dvh: /dvh/.test(css) }, null, 1));
  await b.close();
})();
