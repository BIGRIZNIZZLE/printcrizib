/* Print Crizib · RIZNOSS Chamber 03 — 3D printing purchases, filament inventory and print log.
   Data lives in localStorage (records) + IndexedDB (photos). Modeled on Tool Crizib (Chamber 02). */
'use strict';
const KEY = 'printcrizib:data:v1', BAK = 'printcrizib:backup:v1', SEEDED = 'printcrizib:seeded', APP_VERSION = '1';
const DATA_VERSION = 1;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseD = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addMonths = (s, n) => { const d = parseD(s); if (!d || n == null) return null; const day = d.getDate(); d.setMonth(d.getMonth() + Number(n)); if (d.getDate() < day) d.setDate(0); return iso(d); };
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const num = v => { if (v === '' || v == null) return null; const n = Number(v); return isFinite(n) ? n : null; };
const fmt = (n, d = 0) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n, d = 2) => n == null || !isFinite(n) ? '—' : (n < 0 ? '-$' : '$') + fmt(Math.abs(n), d);
const money0 = n => money(n, n != null && Math.abs(n) >= 1000 ? 0 : 2);
const fdate = s => { const d = parseD(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const plural = (n, w, p) => `${fmt(n)} ${n === 1 ? w : (p || w + 's')}`;
const norm = s => String(s || '').toLowerCase().replace(/[™®]/g, '').replace(/[^a-z0-9.+/ -]/g, ' ').replace(/\s+/g, ' ').trim();
const svg = p => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true">${p}</svg>`;
const I = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'), close: svg('<path d="M18 6 6 18M6 6l12 12"/>'), check: svg('<path d="M20 6 9 17l-5-5"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'), chev: svg('<path d="m6 9 6 6 6-6"/>'), right: svg('<path d="m9 18 6-6-6-6"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'), edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'), camera: svg('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>'),
  drill: svg('<path d="M3 7h11l2 2v3H9l-1 2H6l1-2H3z"/><path d="M16 9h3"/><path d="M19 8v2"/><path d="M8 14l-1 7h4l1-7"/>'),
  battery: svg('<rect x="3" y="7" width="16" height="11" rx="2"/><path d="M21 11v3"/><path d="M7 11v3M11 11v3M15 11v3"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'), plug: svg('<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>'),
  box: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'), shield: svg('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/>'),
  gauge: svg('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'), list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  doc: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  download: svg('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'), upload: svg('<path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16"/>'),
  share: svg('<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>'),
  hand: svg('<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>'),
  cal: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'), print: svg('<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>'),
  spool: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'), bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
};
/* ---------- photos (IndexedDB; compressed JPEG + thumbnail) ---------- */
const Photos = (() => {
  let dbp = null; const urls = new Map(); // id:which -> object URL (revoked by sweep/del)
  const open = () => dbp || (dbp = new Promise((res, rej) => { if (!('indexedDB' in window)) return rej(new Error('no idb')); const r = indexedDB.open('printcrizib-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('p', mode), s = t.objectStore('p'); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  async function shrink(file, max, q) {
    let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    const w0 = bmp.width, h0 = bmp.height, s = Math.min(1, max / Math.max(w0, h0)), w = Math.round(w0 * s), h = Math.round(h0 * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', q));
  }
  return {
    async add(file) { const id = 'ph_' + uid(); const [full, thumb] = await Promise.all([shrink(file, 1600, 0.74), shrink(file, 360, 0.7)]); await tx('readwrite', s => s.put({ id, full, thumb, t: Date.now() })); return id; },
    async get(id) { try { return await tx('readonly', s => s.get(id)); } catch (e) { return null; } },
    async url(id, which = 'thumb') { const k = id + ':' + which; if (urls.has(k)) return urls.get(k); const r = await this.get(id); if (!r || !r[which]) return null; const u = URL.createObjectURL(r[which]); urls.set(k, u); return u; },
    async del(id) { ['thumb', 'full'].forEach(w => { const u = urls.get(id + ':' + w); if (u) { URL.revokeObjectURL(u); urls.delete(id + ':' + w); } }); try { await tx('readwrite', s => s.delete(id)); } catch (e) { /* ignore */ } },
    // free object URLs no longer on screen: big photos always, thumbnails once the cache grows past 200
    sweep() { const live = new Set($$('img[src^="blob:"]').map(i => i.getAttribute('src'))); let thumbs = [...urls.keys()].filter(k => k.endsWith(':thumb')).length;
      for (const [k, u] of [...urls]) { if (live.has(u)) continue; const full = k.endsWith(':full'); if (full || thumbs > 200) { URL.revokeObjectURL(u); urls.delete(k); if (!full) thumbs--; } } },
    get urlCount() { return urls.size; },
    async all() { try { const d = await open(); return await new Promise((res, rej) => { const r = d.transaction('p').objectStore('p').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return []; } },
    async putRaw(rec) { await tx('readwrite', s => s.put(rec)); },
  };
})();
// fill every <img data-ph="id"> on screen
async function loadPh(im) { const u = await Photos.url(im.dataset.ph, im.dataset.full ? 'full' : 'thumb'); if (u) im.src = u; else { const p = im.closest('.ph'); if (p) p.classList.add('missing'); } }
// lazy: only rows near the viewport read IndexedDB; the print sheet and big photos load at once
const phIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { phIO.unobserve(e.target); loadPh(e.target); } }), { rootMargin: '400px 0px' }) : null;
function paintPhotos(root = document) { $$('img[data-ph]', root).forEach(im => { if (im.dataset.done) return; im.dataset.done = 1; if (phIO && !im.dataset.full && !im.closest('.ps-ph')) phIO.observe(im); else loadPh(im); }); }
const blobToData = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const dataToBlob = async d => (await fetch(d)).blob();
/* ---------- UI helpers ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const stat = (k, v, u = '') => `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${v}${u ? `<small>${u}</small>` : ''}</div></div>`;
const pill = st => `<span class="pill ${st.level}">${esc(st.label)}</span>`;
/* iOS / WebKit: pin the page behind any open dialog so focusing a field or opening a list never scrolls the document
   under the sheet; restore the scroll position when the last dialog closes. */
const scrollLock = (() => {
  let y = 0, on = false;
  const lock = () => { if (on) return; on = true; y = window.scrollY || 0; const st = document.body.style; document.documentElement.classList.add('modal-open'); st.position = 'fixed'; st.top = `-${y}px`; st.left = '0'; st.right = '0'; st.width = '100%'; };
  const unlock = () => { if (!on) return; on = false; const st = document.body.style; document.documentElement.classList.remove('modal-open'); st.position = ''; st.top = ''; st.left = ''; st.right = ''; st.width = ''; window.scrollTo(0, y); };
  const sync = () => { if ([...document.querySelectorAll('dialog')].some(d => d.open)) lock(); else unlock(); };
  const watch = () => { const mo = new MutationObserver(sync); document.querySelectorAll('dialog').forEach(d => { mo.observe(d, { attributes: true, attributeFilter: ['open'] }); d.addEventListener('close', () => setTimeout(sync, 0)); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  ['pageshow', 'hashchange', 'orientationchange'].forEach(ev => window.addEventListener(ev, () => setTimeout(sync, 0)));
  return { sync, isOn: () => on };
})();
function ask({ title, msg = '', buttons, typeToConfirm }) {
  return new Promise(res => {
    const d = $('#confirm'), box = $('#confirmInner');
    box.innerHTML = `<h3>${esc(title)}</h3><p>${msg}</p>${typeToConfirm ? `<label class="field"><span class="lbl">Type <b>${esc(typeToConfirm)}</b> to confirm</span><input id="typeConfirm" autocomplete="off" autocapitalize="characters"></label>` : ''}
      <div class="btns">${buttons.map((b, i) => `<button type="button" class="btn ${b.cls || ''}" data-i="${i}" ${typeToConfirm && b.needsType ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div>`;
    const done = val => { d.close(); res(val); };
    box.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) done(buttons[b.dataset.i].value); };
    d.oncancel = e => { e.preventDefault(); done(null); };
    if (typeToConfirm) { const inp = $('#typeConfirm'); inp.oninput = () => $$('button[data-i]', box).forEach((b, i) => { if (buttons[i].needsType) b.disabled = inp.value.trim().toLowerCase() !== typeToConfirm.toLowerCase(); }); }
    d.showModal();
  });
}
const confirmDanger = (title, msg, label = 'Delete') => ask({ title, msg, buttons: [{ label, value: true, cls: 'danger' }, { label: 'Cancel', value: false }] });
function download(name, data, type = 'application/json') { const b = data instanceof Blob ? data : new Blob([data], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
/* ---------- forms ---------- */
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
function fieldHTML(f, vals) {
  if (f.t === 'h') return `<div class="fhead" data-k="${f.k || ''}">${esc(f.l)}</div>`;
  if (f.t === 'hint') return `<div class="field hint" data-k="${f.k}">${f.html || esc(f.l)}</div>`;
  const val = vals[f.k], name = `name="${f.k}"`, cls = `field${f.half ? ' half' : ''}`;
  const lbl = `<span class="lbl">${esc(f.l)}${f.req ? ' *' : ''}</span>`;
  const hint = f.hint ? `<small class="muted fhint">${esc(f.hint)}</small>` : '';
  const ph = f.ph ? `placeholder="${esc(f.ph)}"` : '';
  let inner = '';
  switch (f.t) {
    case 'text': inner = `<input type="text" ${name} value="${esc(val)}" ${ph} autocomplete="off" ${f.caps ? 'autocapitalize="characters" spellcheck="false"' : ''}>`; break;
    case 'num': { const inp = `<input type="number" inputmode="decimal" ${name} value="${esc(val)}" step="${f.step || 'any'}" min="0" ${ph}>`; inner = f.unit ? `<div class="unit">${inp}<em>${esc(f.unit)}</em></div>` : f.pre ? `<div class="unit pre">${inp}<em>${esc(f.pre)}</em></div>` : inp; break; }
    case 'date': inner = `<input type="date" ${name} value="${esc(val)}">`; break;
    case 'color': inner = `<div class="colorpick"><input type="color" ${name} value="${esc(val || '#2f63c9')}" aria-label="${esc(f.l)}"><span class="muted">${esc(f.sub || 'Tap to pick')}</span></div>`; break;
    case 'textarea': inner = `<textarea ${name} ${ph}>${esc(val)}</textarea>`; break;
    case 'select': { const opts = typeof f.opts === 'function' ? f.opts(vals) : f.opts; inner = `<select ${name}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(val ?? '') === String(v) ? 'selected' : ''}>${esc(l || '—')}</option>`; }).join('')}</select>`; break; }
    case 'seg': return `<div class="${cls}" data-k="${f.k}" role="radiogroup" aria-label="${esc(f.l)}">${lbl}<div class="seg">${f.opts.map(o => `<label><input type="radio" ${name} value="${esc(o)}" ${String(val) === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>${hint}</div>`;
    case 'check': return `<div class="${cls}" data-k="${f.k}"><label class="toggle"><span>${esc(f.l)}${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</span><input type="checkbox" role="switch" ${name} ${val ? 'checked' : ''}></label></div>`;
    case 'combo': return `<div class="${cls} combo-f" data-k="${f.k}">${lbl}<div class="combo"><input type="text" ${name} value="${esc(val)}" ${ph} autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-label="${esc(f.l)}" data-combo="${f.k}"><button type="button" class="combo-btn" data-combo-open="${f.k}" aria-label="Show ${esc(f.l.toLowerCase())} list" tabindex="-1">${I.chev}</button></div><div class="combo-list" role="listbox" hidden></div>${hint}</div>`;
    case 'photos': return `<div class="${cls}" data-k="${f.k}">${lbl}<div class="ph-row" data-phrow="${f.k}"></div><input type="file" accept="image/*" ${f.single ? '' : 'multiple'} hidden data-phfile="${f.k}">${hint}</div>`;
  }
  return `<label class="${cls}" data-k="${f.k}">${lbl}${inner}${hint}</label>`;
}
function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    if (!f.k || f.t === 'h' || f.t === 'hint') continue;
    const el = form.elements[f.k];
    switch (f.t) {
      case 'num': o[f.k] = num(el && el.value); break;
      case 'seg': o[f.k] = ($(`input[name="${f.k}"]:checked`, form) || {}).value || ''; break;
      case 'check': o[f.k] = !!(el && el.checked); break;
      case 'photos': o[f.k] = [...(form._ph?.[f.k] || [])]; break;
      default: o[f.k] = ((el && el.value) || '').trim();
    }
  }
  return o;
}
function setField(form, k, v) {
  const el = form.elements[k]; if (!el) return;
  if (el instanceof RadioNodeList) { [...el].forEach(r => { r.checked = r.value === v; }); return; }
  if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
}
// searchable dropdown with "type my own": every combo field's options come from f.opts(vals)
function wireCombos(form, fields, refresh) {
  const C = { open: null, idx: -1, rows: [] };
  const fOf = k => fields.find(f => f.k === k);
  const list = k => $(`[data-k="${k}"] .combo-list`, form);
  function paint(k) {
    const f = fOf(k), box = list(k), inp = form.elements[k]; if (!box || !f) return;
    const vals = readForm(form, fields), q = norm(inp.value);
    const all = [...new Set((typeof f.opts === 'function' ? f.opts(vals) : f.opts || []).filter(Boolean))];
    let rows = q ? all.filter(o => norm(o).includes(q)).sort((a, b) => (norm(b).startsWith(q) - norm(a).startsWith(q))) : all;
    const more = Math.max(0, rows.length - 80); rows = rows.slice(0, 80).map(v => ({ v }));
    if (q && !all.some(o => norm(o) === q)) rows.push({ v: inp.value.trim(), own: 1 });
    C.rows = rows; if (C.idx >= rows.length) C.idx = rows.length - 1;
    box.innerHTML = rows.map((o, i) => `<div class="combo-opt${i === C.idx ? ' on' : ''}${o.own ? ' own' : ''}" role="option" data-copt="${i}" aria-selected="${i === C.idx}">${o.own ? `<span class="ot">Use “<b>${esc(o.v)}</b>”</span><span class="otag mine">my own</span>` : `<span class="ot">${esc(o.v)}</span>`}</div>`).join('')
      + (more ? `<div class="combo-note">${fmt(more)} more. Keep typing to narrow.</div>` : '') + (!q ? `<div class="combo-opt own" role="option" data-cother>Other / type my own</div>` : '');
    box.hidden = false; inp.setAttribute('aria-expanded', 'true');
    const r = box.getBoundingClientRect(); box.classList.toggle('right', r.right > window.innerWidth - 4);
  }
  const close = () => { if (!C.open) return; const b = list(C.open); if (b) b.hidden = true; form.elements[C.open]?.setAttribute('aria-expanded', 'false'); C.open = null; };
  const openC = k => { if (C.open && C.open !== k) close(); C.open = k; C.idx = -1; paint(k); };
  const pick = (k, v) => { setField(form, k, v); close(); const f = fOf(k); f && f.onPick && f.onPick(v, form); refresh(); };
  form.addEventListener('focusin', e => { const k = e.target.dataset?.combo; if (k) openC(k); });
  form.addEventListener('focusout', e => { if (e.target.dataset?.combo) setTimeout(() => { if (!document.activeElement || !document.activeElement.dataset?.combo) close(); }, 180); });
  form.addEventListener('pointerdown', e => { if (e.target.closest('.combo-list')) e.preventDefault(); });
  form.addEventListener('input', e => { const k = e.target.dataset?.combo; if (k) { C.idx = -1; if (C.open !== k) openC(k); else paint(k); } });
  form.addEventListener('keydown', e => {
    const k = e.target.dataset?.combo; if (!k || C.open !== k) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); C.idx = Math.min(C.rows.length - 1, C.idx + 1); paint(k); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); C.idx = Math.max(-1, C.idx - 1); paint(k); }
    else if (e.key === 'Enter' && C.idx >= 0) { e.preventDefault(); pick(k, C.rows[C.idx].v); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  form.addEventListener('click', e => {
    const o = e.target.closest('[data-copt]'); if (o) { const k = C.open; if (k) pick(k, C.rows[+o.dataset.copt].v); return; }
    if (e.target.closest('[data-cother]')) { const k = C.open; close(); const inp = form.elements[k]; inp.value = ''; inp.placeholder = 'Type your own'; inp.focus(); return; }
    const ob = e.target.closest('[data-combo-open]'); if (ob) { e.preventDefault(); const k = ob.dataset.comboOpen; if (C.open === k) close(); else { form.elements[k].focus(); openC(k); } }
  });
  return { close };
}
function wirePhotos(form, fields, vals) {
  form._ph = {}; form._phNew = [];
  fields.filter(f => f.t === 'photos').forEach(f => {
    form._ph[f.k] = [...(Array.isArray(vals[f.k]) ? vals[f.k] : vals[f.k] ? [vals[f.k]] : [])];
    const row = $(`[data-phrow="${f.k}"]`, form), file = $(`[data-phfile="${f.k}"]`, form);
    const paintRow = () => { row.innerHTML = form._ph[f.k].map((id, i) => `<div class="ph sm"><img data-ph="${id}" alt=""><button type="button" class="ph-x" data-phdel="${f.k}:${i}" aria-label="Remove photo">${I.close}</button></div>`).join('')
      + (f.single && form._ph[f.k].length ? '' : `<button type="button" class="ph-add" data-phadd="${f.k}">${I.camera}<span>${esc(f.addL || 'Add photo')}</span></button>`); paintPhotos(row); };
    paintRow();
    file.onchange = async () => {
      const files = [...file.files]; file.value = ''; if (!files.length) return;
      toast(files.length > 1 ? `Saving ${files.length} photos…` : 'Saving photo…');
      for (const fl of files) { try { const id = await Photos.add(fl); form._phNew.push(id); if (f.single) form._ph[f.k] = [id]; else form._ph[f.k].push(id); } catch (e) { console.warn(e); toast('Couldn’t read that photo'); } }
      paintRow();
    };
    row.addEventListener('click', e => {
      if (e.target.closest(`[data-phadd="${f.k}"]`)) { e.preventDefault(); file.click(); }
      const x = e.target.closest('[data-phdel]'); if (x) { e.preventDefault(); const i = +x.dataset.phdel.split(':')[1]; form._ph[f.k].splice(i, 1); paintRow(); }
    });
  });
}
function openForm({ title, fields, values = {}, onSave, onDelete, saveLabel = 'Save', isNew, onReady, top = '' }) {
  const d = $('#sheet'), form = $('#sheetForm');
  form.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body">${top}${fields.map(f => fieldHTML(f, values)).join('')}
    ${onDelete ? `<button type="button" class="btn ghost-danger block" data-del style="margin-top:6px">${I.trash} Delete</button>` : ''}</div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">${I.check} ${esc(saveLabel)}</button></div>`;
  const before = JSON.stringify(values.photos || []) + JSON.stringify(values.receipt || []);
  const applyShow = () => { const vals = readForm(form, fields); fields.forEach(f => { const el = $(`[data-k="${f.k}"]`, form); if (!el) return; if (f.showIf) el.hidden = !f.showIf(vals); if (f.lblFn) { const l = $('.lbl', el); if (l) l.textContent = f.lblFn(vals) + (f.req || f.reqFn?.(vals) ? ' *' : ''); } }); };
  const combos = wireCombos(form, fields, applyShow);
  wirePhotos(form, fields, values);
  let saved = false;
  if (onReady) onReady(form, applyShow);
  applyShow();
  form.oninput = () => applyShow();
  form.onchange = () => applyShow();
  form.onclick = async e => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); }
    if (e.target.closest('[data-del]')) { e.preventDefault(); if (await confirmDanger('Delete this?', 'This can’t be undone. Export a backup first if you might want it back.')) { saved = true; onDelete(); d.close(); render(); toast('Deleted'); } }
  };
  d.onclose = () => { combos.close(); if (!saved) (form._phNew || []).forEach(id => Photos.del(id)); d.onclose = null; };
  form.onsubmit = e => {
    e.preventDefault();
    const vals = readForm(form, fields);
    fields.forEach(f => { if (f.showIf && !f.showIf(vals)) delete vals[f.k]; });
    const miss = fields.find(f => (f.req || f.reqFn?.(vals)) && (vals[f.k] == null || vals[f.k] === '') && (!f.showIf || f.showIf(vals)));
    if (miss) { toast(`${(miss.lblFn ? miss.lblFn(vals) : miss.l)} is required`); const el = form.elements[miss.k]; if (el && el.focus) el.focus(); return; }
    if (onSave(vals, form) === false) return;
    saved = true;
    // photos removed in this edit are deleted from storage
    const kept = new Set([...(vals.photos || []), ...(vals.receipt || [])]);
    JSON.parse('[' + before.replace('][', '],[') + ']').flat().forEach(id => { if (!kept.has(id)) Photos.del(id); });
    save(); d.close(); render();
  };
  d.onclick = e => { if (e.target === d) d.close(); };
  d.showModal();
  $('.sheet-body', form).scrollTop = 0;
  return form;
}const addDays = (s, n) => { const d = parseD(s); if (!d) return null; d.setDate(d.getDate() + Number(n)); return iso(d); };

/* ---------- comic icon set: generic 3D printing gear in RIZNOSS blue; brand is an HTML badge, never baked into the art ---------- */
const CI_LABEL = { printer: '3D printer', ams: 'AMS / filament system', spool: 'filament spool', resin: 'resin bottle', nozzle: 'nozzle / hotend', plate: 'build plate', tools: 'tools', parts: 'spare parts', consumables: 'consumables (glue, IPA)', dryer: 'dryer / storage', part: 'printed part' };
const CI_KEYS = Object.keys(CI_LABEL);
const CATS = [['printer', 'Printers', 'printer'], ['accessory', 'Accessories & upgrades', 'ams'], ['filament', 'Filament', 'spool'], ['resin', 'Resin', 'resin'], ['parts', 'Parts & spares', 'parts'], ['consumables', 'Consumables', 'consumables'], ['tools', 'Tools', 'tools']];
const catL = c => (CATS.find(x => x[0] === c) || [0, 'Other'])[1];
const CAT_SHORT = { printer: 'Printers', accessory: 'Accessories', filament: 'Filament', resin: 'Resin', parts: 'Parts', consumables: 'Consumables', tools: 'Tools' };
function iconKey(x) {
  if (x._k) return x._k;
  if (x.icon && CI_LABEL[x.icon]) return x.icon;
  const n = String(x.name || x.n || '').toLowerCase(), c = x.cat || x.c;
  if (c === 'filament') return 'spool'; if (c === 'resin') return 'resin'; if (c === 'printer') return 'printer';
  if (/nozzle|hotend/.test(n)) return 'nozzle'; if (/plate|pei|bed sheet/.test(n)) return 'plate';
  if (/dryer|dry ?box|desiccant|storage/.test(n)) return 'dryer'; if (/\bams\b|feeder|buffer|hub/.test(n)) return 'ams';
  if (/glue|ipa|alcohol|cleaner|lubric|grease/.test(n)) return 'consumables';
  return (CATS.find(z => z[0] === c) || [0, 0, 'parts'])[2];
}
const brandKey = b => /bambu/i.test(String(b || '')) ? 'bambu' : 'other';
function comicIcon(x, cls = '') {
  const k = iconKey(x), b = x.brand || x.b || '', lbl = 'Comic icon: ' + CI_LABEL[k] + (b ? ', ' + b : '');
  const sw = (x.cat === 'filament' || x.c === 'filament') && x.colorHex ? `<b class="sw-badge" style="--sw:${esc(x.colorHex)}" aria-hidden="true"></b>` : '';
  return `<span class="cicon ${cls} br-${brandKey(b)}"><img src="icons/comic/${k}.webp" alt="${esc(lbl)}" width="56" height="56" loading="lazy" decoding="async"><i class="br-tag" aria-hidden="true"></i>${sw}</span>`;
}

/* ---------- materials (names only; the guide below quotes Bambu Lab's own filament guide) ---------- */
const MATERIALS = ['PLA', 'PLA+', 'PLA Matte', 'PLA Silk', 'PLA-CF', 'PETG', 'PETG HF', 'PETG-CF', 'ABS', 'ABS-GF', 'ASA', 'ASA-CF', 'TPU', 'PA / Nylon', 'PA-CF', 'PA6-CF', 'PA6-GF', 'PAHT-CF', 'PC', 'PET-CF', 'PPA-CF', 'PPS-CF', 'PVA', 'Support (PLA)', 'Support (PA/PET)', 'Support (ABS)'];
// Source: Bambu Lab Wiki, "Filament guide - Printer, Nozzle, AMS, Build Plate, Glue Compatibility and Required Parameters" (updated Oct 13, 2026).
// Stars (heat deflection / impact / tensile) are Bambu's own 1–5 ratings from that page. Nozzle °C is Bambu's range (±10 °C).
const GUIDE_URL = 'https://wiki.bambulab.com/en/general/filament-guide-material-table';
const GUIDE = [
  { m: 'PLA', enc: 'Open or enclosed', hard: 'No', ams: 'Yes', dry: 'Recommended', noz: '190–240', h: 2, i: 2, t: 3, note: 'Easiest to print. Bambu: not for places around 50 °C or hotter (it softens).' },
  { m: 'PLA-CF', enc: 'Open or enclosed', hard: 'Required', ams: 'Bambu PLA-CF: yes', dry: 'Recommended', noz: '210–240', h: 2, i: 2, t: 4 },
  { m: 'PETG', enc: 'Enclosed recommended', hard: 'No', ams: 'Yes', dry: 'Recommended', noz: '240–270', h: 3, i: 3, t: 2, note: 'A good first step up from PLA for functional parts.' },
  { m: 'PETG-CF', enc: 'Enclosed recommended', hard: 'Required', ams: 'AMS yes · AMS lite no', dry: 'Recommended', noz: '240–270', h: 3, i: 3, t: 3 },
  { m: 'ABS', enc: 'Enclosed', hard: 'No', ams: 'AMS yes · AMS lite no', dry: 'Recommended', noz: '240–280', h: 3, i: 3, t: 3 },
  { m: 'ASA', enc: 'Enclosed', hard: 'No', ams: 'Yes', dry: 'Recommended', noz: '240–280', h: 3, i: 3, t: 3 },
  { m: 'PC', enc: 'Enclosed', hard: 'No', ams: 'Yes', dry: 'Required', noz: '260–290', h: 4, i: 4, t: 4 },
  { m: 'PA-CF / PAHT-CF', enc: 'Enclosed', hard: 'Required', ams: 'Bambu PA-CF, PAHT-CF: yes', dry: 'Required', noz: '260–300', h: 5, i: 2, t: 5 },
  { m: 'PET-CF', enc: 'Enclosed', hard: 'Required', ams: 'No', dry: 'Required', noz: '260–300', h: 5, i: 1, t: 5 },
  { m: 'TPU', enc: 'Open or enclosed', hard: 'No', ams: 'No (except TPU for AMS)', dry: 'Required', noz: '200–250', h: 1, i: 5, t: 1, note: 'Flexible, rubbery parts.' },
];
// AMS default when a material is picked (from the table above); the user can always change it
const amsDefault = m => { const s = String(m || '').toUpperCase(); if (/TPU|PET-CF|PPA|PPS/.test(s)) return false; return true; };
const COLORS = [['Black', '#151515'], ['White', '#f4f4f2'], ['Gray', '#8a8f98'], ['Silver', '#c0c4cc'], ['Red', '#d62828'], ['Orange', '#f07a1a'], ['Yellow', '#f5d000'], ['Green', '#2fa84f'], ['Blue', '#2f63c9'], ['Navy', '#1c2a55'], ['Purple', '#7b3fb8'], ['Pink', '#ec6fa6'], ['Brown', '#6e4b2a'], ['Beige', '#d9c7a3'], ['Clear / natural', '#e8ecef'], ['Carbon black', '#232323']];
const BRANDS = ['Bambu Lab', 'Polymaker', 'eSUN', 'Elegoo', 'SUNLU', 'Overture', 'Prusament', 'Hatchbox', 'Inland', 'Creality', 'Anycubic', 'Siraya Tech', 'Jayo', 'Kingroon', 'Generic'];
const VENDORS = ['Bambu Lab US store', 'Amazon', 'Micro Center', 'Best Buy', 'Walmart', 'Polymaker store', 'eSUN store', 'Elegoo store', 'eBay', 'Facebook Marketplace', 'Gift'];
const LOCATIONS = ['Print station', 'Garage', 'Shop', 'Office', 'Closet', 'Dry box', 'AMS', 'Shelf', 'Storage bin'];
const STATUSES = ['Active', 'Used up', 'Sold', 'Returned', 'Retired'];

/* ---------- data ---------- */
function blank() { return { version: DATA_VERSION, items: [], prints: [], custom: [], settings: { theme: 'auto', lowG: 200 } }; }
function normalize(j) {
  const d = { ...blank(), ...(j && typeof j === 'object' ? j : {}) };
  for (const k of ['items', 'prints', 'custom']) d[k] = Array.isArray(d[k]) ? d[k].filter(x => x && x.id) : [];
  d.settings = { ...blank().settings, ...(d.settings || {}) };
  const now = new Date().toISOString();
  for (const it of d.items) {
    if (!CATS.some(c => c[0] === it.cat)) it.cat = it.cat === 'spool' ? 'filament' : 'parts';
    if (!it.status) it.status = 'Active'; if (!Array.isArray(it.photos)) it.photos = []; if (!it.created) it.created = now; if (!it.updated) it.updated = it.created;
    if (it.cat === 'filament') { if (num(it.spoolG) == null) it.spoolG = 1000; if (num(it.remainG) == null) it.remainG = num(it.spoolG); if (typeof it.ams !== 'boolean') it.ams = amsDefault(it.material); }
  }
  for (const p of d.prints) { if (!p.created) p.created = now; if (!p.result) p.result = 'Success'; }
  d.version = DATA_VERSION;
  return d;
}
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    // keep a copy of whatever an older version wrote before upgrading it (non-destructive migrations)
    if ((j.version || 0) < DATA_VERSION) try { localStorage.setItem(BAK + ':pre-v' + DATA_VERSION, raw); } catch (e) { /* quota */ }
    return normalize(j);
  } catch (e) {
    try { localStorage.setItem(BAK + ':corrupt', raw); } catch (e2) { /* quota */ }
    return blank();
  }
}
let FRESH = false;
let db = load() || (FRESH = true, blank());
// write the upgraded copy back once so the backup above is taken only for the original pre-upgrade data
try { const r0 = localStorage.getItem(KEY); if (r0 && !FRESH && (JSON.parse(r0).version || 0) < DATA_VERSION) localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* corrupt or private mode */ }
let DBV = 0;
function save() {
  DBV++;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save. Your browser storage may be full.'); }
  try { window.PrintCrizibSync && window.PrintCrizibSync.changed(); } catch (e) { console.warn(e); }
}
const itemById = id => db.items.find(x => x.id === id) || null;
const printById = id => db.prints.find(x => x.id === id) || null;
const active = it => (it.status || 'Active') === 'Active';
const isSpool = it => it.cat === 'filament';
// price paid: stored value if set, else list price minus coupon
const cost = it => { if (num(it.paid) != null) return num(it.paid); const l = num(it.listPrice); return l == null ? null : Math.max(0, l - (num(it.coupon) || 0)); };
const lineCost = it => { const c = cost(it); return c == null ? null : c; };
const spent = list => list.filter(x => x.status !== 'Returned').reduce((t, x) => t + (lineCost(x) || 0), 0);
const missingPrice = it => cost(it) == null;
const couponTodo = it => !!it.couponTodo && num(it.coupon) == null;
const perKg = it => { const c = cost(it), g = num(it.spoolG); return c != null && g > 0 ? c / (g / 1000) : null; };
const leftG = it => Math.max(0, num(it.remainG) ?? num(it.spoolG) ?? 0);
const leftFrac = it => { const g = num(it.spoolG); return g > 0 ? Math.min(1, leftG(it) / g) : 0; };
const spoolValue = it => (cost(it) || 0) * leftFrac(it);
const lowG = () => num(db.settings.lowG) ?? 200;
const isLow = it => isSpool(it) && active(it) && leftG(it) <= lowG();
const matOf = it => it.material || 'Unknown';
const spoolTitle = it => [it.brand, it.name || it.material, it.color].filter(Boolean).join(' ') || 'Spool';
const itemTitle = it => isSpool(it) ? spoolTitle(it) : (it.name || [it.brand, it.model].filter(Boolean).join(' ') || 'Item');
const itemSub = it => isSpool(it) ? [it.brand, it.material, it.color].filter(Boolean).join(' · ') : [it.brand, catL(it.cat), it.model].filter(Boolean).join(' · ');
function windowState(end, label, soonDays) {
  if (!end) return { level: 'none', label: `No ${label} date`, end: null };
  const d = daysBetween(todayISO(), end);
  if (d < 0) return { level: 'over', label: `${label[0].toUpperCase() + label.slice(1)} ended`, end, d };
  if (d <= soonDays) return { level: 'soon', label: d === 0 ? `${label[0].toUpperCase() + label.slice(1)} ends today` : `${label[0].toUpperCase() + label.slice(1)}: ${plural(d, 'day')} left`, end, d };
  return { level: 'ok', label: `${label[0].toUpperCase() + label.slice(1)} until ${fdate(end)}`, end, d };
}
const ppState = it => windowState(it.ppUntil, 'price protection', 7);
const warrantyState = it => windowState(it.warrantyEnd, 'warranty', 60);
const ppOpen = it => active(it) && it.ppUntil && daysBetween(todayISO(), it.ppUntil) >= 0;
const isBambuVendor = v => /bambu/i.test(String(v || ''));

/* ---------- Bambu Lab quick-pick catalog (names from bambulab.com's product sitemap; lazy, cached offline) ---------- */
let CAT = null, catP = null;
function loadCatalog() {
  if (CAT) return Promise.resolve(CAT);
  return catP || (catP = fetch('catalog.json').then(r => { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); }).then(j => { CAT = j; CAT.items.forEach(x => { x._s = norm([x.n, x.mat, x.c, x.b].join(' ')); }); return CAT; }).catch(e => { catP = null; throw e; }));
}
const customAsCat = () => db.custom.map(c => ({ id: 'my:' + c.id, b: c.brand, c: c.cat, n: c.name, mat: c.material, k: c.icon, mine: 1, model: c.model, _s: norm([c.name, c.brand, c.material, c.model].join(' ')) }));

/* ---------- item / purchase form ---------- */
const usedVals = k => [...new Set(db.items.map(x => x[k]).filter(Boolean))];
const showSp = x => x.cat === 'filament';
const ITEM_FIELDS = [
  { t: 'h', l: 'What is it' },
  { k: 'cat', l: 'Category', t: 'select', opts: CATS.map(c => [c[0], c[1]]) },
  { k: 'brand', l: 'Brand', t: 'combo', half: 1, opts: () => [...new Set([...BRANDS, ...usedVals('brand')])], ph: 'Bambu Lab, Polymaker…' },
  { k: 'model', l: 'Model / SKU', t: 'text', half: 1, caps: 1, ph: 'Optional' },
  { k: 'name', l: 'Name', t: 'text', reqFn: x => !showSp(x), ph: 'e.g. Bambu Lab P2S Combo', lblFn: x => showSp(x) ? 'Name (optional)' : 'Name' },
  { k: 'icon', l: 'Icon', t: 'select', half: 1, opts: () => [['', 'Auto'], ...CI_KEYS.map(k => [k, CI_LABEL[k]])], showIf: x => !showSp(x) },
  { k: 'qty', l: 'Quantity', t: 'num', half: 1, step: 1, showIf: x => !showSp(x), hint: 'Price below is for all of them.' },
  { t: 'h', l: 'Filament', k: 'h_fil', showIf: showSp },
  { k: 'material', l: 'Material', t: 'combo', half: 1, opts: () => [...new Set([...MATERIALS, ...usedVals('material')])], showIf: showSp, reqFn: showSp, ph: 'PLA, PETG, PA-CF…', onPick: (v, form) => { if (!form._amsTouched) setField(form, 'ams', amsDefault(v)); } },
  { k: 'color', l: 'Color', t: 'combo', half: 1, opts: () => [...new Set([...COLORS.map(c => c[0]), ...usedVals('color')])], showIf: showSp, ph: 'Black, Jade White…', onPick: (v, form) => { const c = COLORS.find(z => z[0] === v); if (c) setField(form, 'colorHex', c[1]); } },
  { k: 'colorHex', l: 'Swatch', t: 'color', half: 1, showIf: showSp, sub: 'Tap to match the spool' },
  { k: 'diameter', l: 'Diameter', t: 'select', half: 1, opts: [['1.75', '1.75 mm'], ['2.85', '2.85 mm']], showIf: showSp },
  { k: 'spoolG', l: 'Spool weight (net)', t: 'num', half: 1, unit: 'g', step: 1, showIf: showSp, hint: 'Filament only, usually 1000 g.' },
  { k: 'remainG', l: 'Grams left', t: 'num', half: 1, unit: 'g', step: 1, showIf: showSp, hint: 'Blank = full spool.' },
  { k: 'ams', l: 'AMS-compatible', t: 'check', sub: 'Filled in from Bambu’s filament guide when you pick a material. Change it if your spool says otherwise.', showIf: showSp },
  { k: 'openedOn', l: 'Opened', t: 'date', half: 1, showIf: showSp },
  { k: 'driedOn', l: 'Last dried', t: 'date', half: 1, showIf: showSp },
  { t: 'h', l: 'Purchase' },
  { k: 'vendor', l: 'Store / vendor', t: 'combo', half: 1, opts: () => [...new Set([...usedVals('vendor'), ...VENDORS])], ph: 'Where you bought it' },
  { k: 'orderDate', l: 'Order date', t: 'date', half: 1 },
  { k: 'listPrice', l: 'List / sale price', t: 'num', half: 1, pre: '$', lblFn: x => showSp(x) ? 'Price per spool' : 'List / sale price', hint: 'Before any coupon.' },
  { k: 'coupon', l: 'Coupon / discount', t: 'num', half: 1, pre: '$', hint: 'Dollar amount off. Blank if none.' },
  { k: 'paid', l: 'Price paid', t: 'num', half: 1, pre: '$', lblFn: x => showSp(x) ? 'Paid per spool' : 'Price paid', hint: 'Fills in as price − coupon. Edit it for tax, shipping or gift cards.' },
  { k: 'orderNo', l: 'Order #', t: 'text', half: 1, caps: 1 },
  { k: 'spoolsN', l: 'Spools in this order', t: 'num', half: 1, step: 1, showIf: showSp, hint: 'Adds one entry per spool, each at the per-spool price.' },
  { k: 'ppUntil', l: 'Price protection until', t: 'date', half: 1, hint: 'Bambu Lab store orders default to 30 days after the order date. Check your order’s terms and change it if needed.' },
  { k: 'warrantyEnd', l: 'Warranty ends', t: 'date', half: 1, hint: 'From your receipt or the maker’s warranty page.' },
  { t: 'h', l: 'Where & notes' },
  { k: 'location', l: 'Storage location', t: 'combo', half: 1, opts: () => [...new Set([...usedVals('location'), ...LOCATIONS])] },
  { k: 'status', l: 'Status', t: 'select', half: 1, opts: STATUSES },
  { k: 'photos', l: 'Photos', t: 'photos', addL: 'Add photo', hint: 'Stored on this device only, compressed. Private Browsing can’t keep photos.' },
  { k: 'receipt', l: 'Receipt', t: 'photos', single: 1, addL: 'Receipt photo' },
  { k: 'notes', l: 'Notes', t: 'textarea', ph: 'Settings that worked, upgrades, anything' },
];
function itemForm(existing, preset = {}) {
  const it = existing || null;
  const vals = it ? { ...it, diameter: it.diameter || '1.75', receipt: it.receipt ? [it.receipt] : [] }
    : { cat: 'printer', status: 'Active', orderDate: todayISO(), qty: 1, spoolG: 1000, diameter: '1.75', spoolsN: 1, photos: [], receipt: [], ...preset };
  if (!it && vals.cat === 'filament' && vals.ams == null) vals.ams = amsDefault(vals.material);
  if (!it && isBambuVendor(vals.vendor) && !vals.ppUntil && vals.orderDate) vals.ppUntil = addDays(vals.orderDate, 30);
  const top = (!it && preset.catId ? `<div class="catpick"><span class="otag ${preset.mine ? 'mine' : 'cat'}">${preset.mine ? 'my own' : 'Bambu Lab catalog'}</span><b>${esc(preset.name)}</b><small>${esc([preset.brand, catL(preset.cat), preset.material].filter(Boolean).join(' · '))}</small></div>` : '')
    + (it && couponTodo(it) ? `<div class="banner soon" role="status"><span><b>Enter your coupon amount.</b> Put the dollar amount the coupon took off in <b>Coupon / discount</b>; price paid updates by itself.</span></div>` : '');
  openForm({
    title: it ? (isSpool(it) ? 'Edit spool' : 'Edit item') : 'Add to your forge', fields: it ? ITEM_FIELDS.filter(f => f.k !== 'spoolsN') : ITEM_FIELDS, values: vals, isNew: !it, top, saveLabel: it ? 'Save' : 'Add',
    onReady: (form, refresh) => {
      const autoPaid = () => { const l = num(form.elements.listPrice.value), c = num(form.elements.coupon.value); return l == null ? null : Math.max(0, Math.round((l - (c || 0)) * 100) / 100); };
      form._paidTouched = !!(it && it.paidManual);
      form._ppTouched = !!(it && it.ppUntil && !(isBambuVendor(it.vendor) && it.orderDate && it.ppUntil === addDays(it.orderDate, 30)));
      form._amsTouched = !!it;
      if (!form._paidTouched && num(form.elements.paid.value) == null) { const a = autoPaid(); if (a != null) form.elements.paid.value = a; }
      form.addEventListener('input', e => {
        const n = e.target.name;
        if (n === 'paid') form._paidTouched = form.elements.paid.value !== '' && num(form.elements.paid.value) !== autoPaid();
        if (n === 'listPrice' || n === 'coupon') { if (!form._paidTouched) { const a = autoPaid(); form.elements.paid.value = a == null ? '' : a; } }
        if (n === 'ppUntil') form._ppTouched = true;
        if (n === 'vendor' || n === 'orderDate') { if (!form._ppTouched) { const v = form.elements.vendor.value, d = form.elements.orderDate.value; form.elements.ppUntil.value = isBambuVendor(v) && d ? addDays(d, 30) : ''; } }
        if (n === 'material') { if (!form._amsTouched) setField(form, 'ams', amsDefault(form.elements.material.value)); }
        if (n === 'ams') form._amsTouched = true;
        if (n === 'spoolG' && !it) { /* a new spool starts full */ }
      });
      form.addEventListener('change', e => { if (e.target.name === 'ams') form._amsTouched = true; if (e.target.name === 'vendor' || e.target.name === 'orderDate') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    },
    onSave: (v, form) => {
      const fil = v.cat === 'filament';
      const now = new Date().toISOString();
      const paid = v.paid != null ? v.paid : (v.listPrice != null ? Math.max(0, v.listPrice - (v.coupon || 0)) : null);
      const autoP = v.listPrice != null ? Math.max(0, Math.round((v.listPrice - (v.coupon || 0)) * 100) / 100) : null;
      const rec = { ...(it || {}), cat: v.cat, brand: v.brand, model: v.model, name: v.name, icon: fil ? '' : v.icon, qty: fil ? 1 : (v.qty || 1),
        vendor: v.vendor, orderDate: v.orderDate, orderNo: v.orderNo, listPrice: v.listPrice, coupon: v.coupon, paid, paidManual: paid != null && autoP != null && Math.abs(paid - autoP) > 0.004,
        couponTodo: (it ? !!it.couponTodo : !!preset.couponTodo) && v.coupon == null, ppUntil: v.ppUntil, warrantyEnd: v.warrantyEnd,
        location: v.location, status: v.status || 'Active', photos: v.photos || [], receipt: (v.receipt || [])[0] || '', notes: v.notes, updated: now };
      if (fil) Object.assign(rec, { material: v.material, color: v.color, colorHex: v.colorHex, diameter: v.diameter || '1.75', spoolG: v.spoolG || 1000, remainG: v.remainG != null ? Math.min(v.remainG, v.spoolG || 1000) : (it ? leftG(it) : (v.spoolG || 1000)), ams: !!v.ams, openedOn: v.openedOn, driedOn: v.driedOn });
      else for (const k of ['material', 'color', 'colorHex', 'diameter', 'spoolG', 'remainG', 'ams', 'openedOn', 'driedOn']) delete rec[k];
      if (rec.status === 'Active' && fil && leftG(rec) === 0 && it && leftG(it) > 0) rec.status = 'Used up';
      if (it) { Object.assign(it, rec); toast('Saved'); return; }
      const n = fil ? Math.max(1, Math.min(50, Math.round(v.spoolsN || 1))) : 1;
      let first = null;
      for (let i = 0; i < n; i++) { const r = { ...rec, id: uid(), created: now, photos: i ? [] : rec.photos, receipt: i ? '' : rec.receipt }; if (preset.catId) { r.catId = preset.catId; r.src = preset.src || ''; } db.items.push(r); if (!first) first = r; }
      // remember non-catalog products for next time
      if (!preset.catId && (v.name || v.material) && v.brand) {
        const key = norm(v.brand) + '|' + norm(v.name || '') + '|' + norm(v.material || '') + '|' + norm(v.color || '');
        if (!db.custom.some(c => norm(c.brand) + '|' + norm(c.name || '') + '|' + norm(c.material || '') + '|' + norm(c.color || '') === key)) db.custom.push({ id: uid(), brand: v.brand, cat: v.cat, name: v.name, model: v.model, material: v.material || '', color: v.color || '', icon: v.icon || '', created: now, updated: now });
      }
      toast(n > 1 ? `Added ${plural(n, 'spool')}` : 'Added to the forge');
      if (!first.photos.length) snapFor = first.id;
      setTimeout(() => { location.hash = '#/item/' + first.id; }, 0);
    },
    onDelete: it ? () => { (it.photos || []).concat(it.receipt || []).forEach(id => Photos.del(id)); db.items = db.items.filter(x => x !== it); } : null,
  });
}

/* ---------- print log ---------- */
const spoolOpts = cur => [['', '— No spool / not tracked —'], ...db.items.filter(x => isSpool(x) && (active(x) || x.id === cur)).map(x => [x.id, `${spoolTitle(x)} · ${fmt(leftG(x))} g left`])];
function printForm(existing, preset = {}) {
  const p = existing || null;
  const F = [
    { k: 'name', l: 'Part name', t: 'text', req: 1, ph: 'e.g. Bracket v2' },
    { k: 'date', l: 'Printed on', t: 'date', half: 1 },
    { k: 'result', l: 'Result', t: 'seg', opts: ['Success', 'Failed'] },
    { k: 'spoolId', l: 'Filament used', t: 'select', opts: () => spoolOpts(p && p.spoolId) },
    { k: 'grams', l: 'Grams used', t: 'num', half: 1, unit: 'g', step: 1, hint: 'From the slicer. Taken off the spool.' },
    { k: 'hours', l: 'Print time', t: 'num', half: 1, unit: 'h', step: 'any', hint: 'e.g. 2.5' },
    { k: 'photos', l: 'Photos', t: 'photos', addL: 'Add photo', hint: 'Stored on this device only.' },
    { k: 'notes', l: 'Notes', t: 'textarea', ph: 'Settings, what went wrong, what to change' },
  ];
  openForm({ title: p ? 'Edit print' : 'Log a print', fields: F, values: p ? { ...p } : { date: todayISO(), result: 'Success', photos: [], ...preset }, isNew: !p, saveLabel: p ? 'Save' : 'Log print',
    onSave: v => {
      const now = new Date().toISOString();
      // give back what this print took before (edit), then take the new amount
      if (p && p.spoolId && num(p.grams)) { const s = itemById(p.spoolId); if (s) { s.remainG = Math.min(num(s.spoolG) || 1e9, leftG(s) + num(p.grams)); if (s.status === 'Used up' && leftG(s) > 0) s.status = 'Active'; s.updated = now; } }
      if (v.spoolId && num(v.grams)) { const s = itemById(v.spoolId); if (s) { s.remainG = Math.max(0, leftG(s) - num(v.grams)); if (!s.openedOn) s.openedOn = v.date || todayISO(); if (leftG(s) === 0) s.status = 'Used up'; s.updated = now; } }
      const rec = { ...(p || {}), name: v.name, date: v.date, result: v.result || 'Success', spoolId: v.spoolId, grams: v.grams, hours: v.hours, photos: v.photos || [], notes: v.notes, updated: now };
      if (p) Object.assign(p, rec); else { rec.id = uid(); rec.created = now; db.prints.push(rec); }
      const s = v.spoolId && itemById(v.spoolId);
      toast(s && num(v.grams) ? `Logged · ${fmt(leftG(s))} g left on ${spoolTitle(s)}` : 'Print logged');
      if (!p) setTimeout(() => { location.hash = '#/prints'; }, 0);
    },
    onDelete: p ? () => { if (p.spoolId && num(p.grams)) { const s = itemById(p.spoolId); if (s) { s.remainG = Math.min(num(s.spoolG) || 1e9, leftG(s) + num(p.grams)); if (s.status === 'Used up' && leftG(s) > 0) s.status = 'Active'; s.updated = new Date().toISOString(); } } (p.photos || []).forEach(id => Photos.del(id)); db.prints = db.prints.filter(x => x !== p); } : null });
}

/* ---------- add flow: Bambu Lab quick-pick + my own ---------- */
const PK = { c: 'printer', q: '' };
async function addFlow(preset = {}) {
  const d = $('#sheet'), form = $('#sheetForm');
  if (preset.cat) PK.c = preset.cat; PK.q = '';
  form.innerHTML = `<div class="sheet-head"><h3>Add to your forge</h3><button type="button" class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="sheet-body picker" id="picker"><div class="combo-note">Loading the Bambu Lab list…</div></div>
    <div class="sheet-foot"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn primary" data-own>${I.edit} Add my own</button></div>`;
  form.onsubmit = e => e.preventDefault(); form.oninput = null; form.onchange = null;
  d.onclose = null; d.onclick = e => { if (e.target === d) d.close(); };
  form.onclick = e => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); d.close(); return; }
    if (e.target.closest('[data-own]')) { e.preventDefault(); d.close(); setTimeout(() => itemForm(null, { cat: PK.c }), 60); return; }
    const b = e.target.closest('[data-pk]'); if (b) { e.preventDefault(); PK.c = b.dataset.pk; paintPicker(true); return; }
    const r = e.target.closest('[data-cat]'); if (r) { e.preventDefault(); chooseCat(r.dataset.cat); }
  };
  if (!d.open) d.showModal();
  try { await loadCatalog(); } catch (e) { CAT = { items: [], generated: '' }; }
  paintPicker(true);
}
function paintPicker(first) {
  const box = $('#picker'); if (!box) return;
  const pool = [...customAsCat(), ...(CAT ? CAT.items : [])].filter(x => x.c === PK.c);
  const q = norm(PK.q);
  const rows = q ? pool.filter(x => q.split(' ').every(w => x._s.includes(w))) : pool;
  const chip = (v, l, n) => `<button type="button" class="pchip${PK.c === v ? ' on' : ''}" data-pk="${v}">${esc(l)}${n ? `<small>${fmt(n)}</small>` : ''}</button>`;
  const all = [...customAsCat(), ...(CAT ? CAT.items : [])];
  box.innerHTML = `<div class="pk-row scroll">${CATS.map(([c]) => chip(c, CAT_SHORT[c], all.filter(x => x.c === c).length)).join('')}</div>
    <label class="search pk-search">${I.search}<input type="search" id="pkq" value="${esc(PK.q)}" placeholder="Search ${esc(CAT_SHORT[PK.c].toLowerCase())}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search the list"></label>
    <div class="pick-results" role="list">${rows.map(x => `<button type="button" class="prow" role="listitem" data-cat="${esc(x.id)}">${comicIcon({ _k: x.k && CI_LABEL[x.k] ? x.k : iconKey({ cat: x.c, name: x.n }), brand: x.b })}<span class="pr-main"><b>${esc(x.n || x.mat)}</b><small>${esc([x.b, x.mat, x.model].filter(Boolean).join(' · '))}</small></span>${x.mine ? '<span class="otag mine">my own</span>' : ''}</button>`).join('')
      || `<div class="empty"><div class="big">${CAT && CAT.items.length ? 'Nothing here yet' : 'List unavailable offline'}</div><p>Tap <b>Add my own</b> and type it in; it’s saved for next time.</p></div>`}</div>
    <p class="muted pk-foot">${CAT && CAT.items.length ? `Bambu Lab names from <a href="https://us.store.bambulab.com/" target="_blank" rel="noopener">bambulab.com</a>, checked ${esc(CAT.generated)}. No prices are stored; enter what you paid.` : ''}</p>`;
  const inp = $('#pkq');
  inp.oninput = () => { PK.q = inp.value; clearTimeout(paintPicker.t); paintPicker.t = setTimeout(() => { const pos = inp.selectionStart; paintPicker(); const n = $('#pkq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } }, 140); };
  if (first) box.scrollTop = 0;
}
function chooseCat(id) {
  const x = [...customAsCat(), ...(CAT ? CAT.items : [])].find(c => c.id === id); if (!x) return;
  $('#sheet').close();
  const bambu = /bambu/i.test(x.b || '');
  const fil = x.c === 'filament';
  setTimeout(() => itemForm(null, { catId: x.id, mine: x.mine, cat: x.c, brand: x.b, name: x.n, model: x.model || '', material: x.mat || '', icon: x.k && !['spool', 'printer'].includes(x.k) ? x.k : '', src: x.u || '', vendor: bambu && !x.mine ? 'Bambu Lab US store' : '', ams: fil ? amsDefault(x.mat) : undefined }), 60);
}

/* ---------- views ---------- */
const thumb = (it, cls = '') => it.photos && it.photos[0] ? `<span class="ph ${cls} br-${brandKey(it.brand)}"><img data-ph="${esc(it.photos[0])}" alt="Photo of ${esc(itemTitle(it))}" width="56" height="56" decoding="async"><i class="br-tag" aria-hidden="true"></i>${isSpool(it) && it.colorHex ? `<b class="sw-badge" style="--sw:${esc(it.colorHex)}" aria-hidden="true"></b>` : ''}</span>` : comicIcon(it, cls);
const swatch = it => `<i class="swatch" style="--sw:${esc(it.colorHex || '#8a8f98')}" aria-hidden="true"></i>`;
const gbar = it => `<span class="gbar${isLow(it) ? ' low' : ''}" role="img" aria-label="${fmt(leftG(it))} of ${fmt(num(it.spoolG))} grams left"><i style="width:${Math.round(leftFrac(it) * 100)}%"></i></span>`;
function itemRow(it) {
  const pp = ppState(it), w = warrantyState(it), c = lineCost(it);
  const tags = [ppOpen(it) ? `<span class="tag ${pp.level === 'soon' ? 'warn' : 'accent'}">Price protection · ${plural(pp.d, 'day')}</span>` : '', w.level === 'soon' ? '<span class="tag warn">Warranty ending</span>' : '',
    couponTodo(it) ? '<span class="tag warn">Enter coupon</span>' : '', !active(it) ? `<span class="tag">${esc(it.status)}</span>` : '', (num(it.qty) || 1) > 1 ? `<span class="tag">×${fmt(it.qty)}</span>` : '', missingPrice(it) ? '<span class="tag warn">No price</span>' : ''].join('');
  return `<a class="entry${active(it) ? '' : ' dim'}" href="#/item/${it.id}">${thumb(it)}<div class="e-main"><b>${esc(itemTitle(it))}</b><div class="e-sub">${esc(itemSub(it))}</div>${tags ? `<div class="tags">${tags}</div>` : ''}</div>
    <div class="e-side"><b>${c != null ? money0(c) : '—'}</b><small>${esc(it.vendor || '')}</small></div></a>`;
}
function spoolRow(it) {
  const pk = perKg(it);
  const tags = [isLow(it) ? '<span class="tag warn">Low</span>' : '', it.ams ? '<span class="tag accent">AMS</span>' : '<span class="tag">Not for AMS</span>', !active(it) ? `<span class="tag">${esc(it.status)}</span>` : '',
    it.driedOn ? `<span class="tag">Dried ${esc(ago(it.driedOn))}</span>` : '', ppOpen(it) ? '<span class="tag accent">Price protection</span>' : '', couponTodo(it) ? '<span class="tag warn">Enter coupon</span>' : ''].join('');
  return `<a class="entry spool${active(it) ? '' : ' dim'}" href="#/item/${it.id}">${thumb(it)}<div class="e-main"><b>${swatch(it)}${esc(spoolTitle(it))}</b><div class="e-sub">${esc([it.material, it.diameter && it.diameter !== '1.75' ? it.diameter + ' mm' : '', it.location].filter(Boolean).join(' · '))}</div>
    <div class="grow">${gbar(it)}<small><b>${fmt(leftG(it))}</b> / ${fmt(num(it.spoolG))} g</small></div>${tags ? `<div class="tags">${tags}</div>` : ''}</div>
    <div class="e-side"><b>${pk != null ? money(pk, 2) : '—'}</b><small>per kg</small></div></a>`;
}
const ago = s => { const d = daysBetween(s, todayISO()); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : fdate(s); };
const bars = (rows, total, fmtV = v => fmt(v)) => `<div class="bars">${rows.map(([l, v, sub, href]) => `<a class="bar-row" ${href ? `href="${href}"` : ''}><span class="bl">${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="bt"><i style="width:${total ? Math.max(3, Math.round(v / total * 100)) : 0}%"></i></span><b>${fmtV(v)}</b></a>`).join('')}</div>`;
const groupBy = (list, fn) => { const m = new Map(); list.forEach(x => { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };
function reminders() {
  const out = [];
  db.items.filter(active).forEach(it => {
    const p = ppState(it);
    if (p.end && p.d >= 0) out.push({ key: 'p:' + it.id + ':' + p.end, it, level: p.d <= 7 ? 'soon' : 'info', kind: 'pp', d: p.d, t: p.d === 0 ? 'Price protection ends today' : `Price protection ends ${fdate(p.end)} · ${plural(p.d, 'day')} left` });
    const w = warrantyState(it);
    if (w.level === 'soon' || (w.level === 'over' && w.d >= -30)) out.push({ key: 'w:' + it.id + ':' + w.end, it, level: w.level, kind: 'w', d: w.d, t: w.level === 'soon' ? `Warranty ends ${fdate(w.end)}` : `Warranty ended ${fdate(w.end)}` });
    if (isLow(it)) out.push({ key: 'l:' + it.id + ':' + Math.floor(leftG(it) / 50), it, level: 'soon', kind: 'low', d: 0, t: `Low: ${fmt(leftG(it))} g left` });
  });
  return out.sort((a, b) => (a.level === 'info') - (b.level === 'info') || a.d - b.d);
}
function emptyState() {
  return `<section class="card empty-hero"><div class="hero-empty"></div><div class="big">Your forge starts here</div>
    <p class="muted">Log your printers, AMS, filament spools, resin, nozzles and plates with what you paid, the coupon you used, and when price protection and warranty run out.</p>
    <div class="btn-row"><button class="btn primary" data-act="add">${I.plus} Add your first item</button><button class="btn" data-act="addSpool">${I.plus} Add a spool</button></div></section>`;
}
function ppBanners() {
  const open = db.items.filter(ppOpen).sort((a, b) => String(a.ppUntil).localeCompare(String(b.ppUntil)));
  return open.map(it => { const s = ppState(it); return `<a class="banner pp ${s.level === 'soon' ? 'soon' : ''}" href="#/item/${it.id}" role="status"><span class="pp-ic">${I.shield}</span><span><b>Price protection open</b> for ${esc(itemTitle(it))} until ${esc(fdate(it.ppUntil))} (${s.d === 0 ? 'ends today' : plural(s.d, 'day') + ' left'}). If ${esc(it.vendor || 'the store')} drops the price before then, you may be able to claim the difference. Check your order’s terms.</span>${I.right}</a>`; }).join('');
}
function starterBanner() {
  const s = db.items.find(x => x.seed && couponTodo(x)); if (!s) return '';
  return `<section class="card starter" role="status"><div class="card-head"><h3>${I.edit} Your ${esc(s.short || 'printer')} is logged</h3><span class="tag warn">1 step</span></div>
    <p class="muted" style="margin:0 0 10px">${esc(itemTitle(s))} · ${esc(s.vendor)} · ${esc(fdate(s.orderDate))} · ${money(num(s.listPrice))} before coupon. <b>Enter your coupon amount</b> so the price you paid is right. Edit or delete it anytime.</p>
    <div class="btn-row"><button class="btn small primary" data-act="editItem" data-id="${s.id}">${I.edit} Enter coupon amount</button><a class="btn small" href="#/item/${s.id}">Open it</a></div></section>`;
}
function viewDash() {
  if (!db.items.length && !db.prints.length) return joinCoach() + emptyState() + rzFoot();
  const act = db.items.filter(active), spools = act.filter(isSpool), total = spent(db.items);
  const kg = spools.reduce((t, x) => t + leftG(x), 0) / 1000, filVal = spools.reduce((t, x) => t + spoolValue(x), 0);
  const byCat = CATS.map(([c, l]) => { const list = db.items.filter(x => x.cat === c && x.status !== 'Returned'); return [l, spent(list), list.length ? plural(list.length, isSpool({ cat: c }) ? 'spool' : 'item') : '', '#/' + (c === 'filament' ? 'filament' : 'inv?c=' + c)]; }).filter(r => r[1] > 0 || r[2]);
  const byMat = [...groupBy(spools, matOf)].map(([m, l]) => ({ m, g: l.reduce((t, x) => t + leftG(x), 0), v: l.reduce((t, x) => t + spoolValue(x), 0), n: l.length })).sort((a, b) => b.g - a.g);
  const rem = reminders(), pp = db.items.filter(x => x.ppUntil && active(x) && daysBetween(todayISO(), x.ppUntil) >= -14).sort((a, b) => String(a.ppUntil).localeCompare(String(b.ppUntil)));
  const war = db.items.filter(x => x.warrantyEnd && active(x) && daysBetween(todayISO(), x.warrantyEnd) >= -30).sort((a, b) => String(a.warrantyEnd).localeCompare(String(b.warrantyEnd)));
  const low = spools.filter(isLow).sort((a, b) => leftG(a) - leftG(b));
  const noPrice = db.items.filter(x => missingPrice(x) && x.status !== 'Returned'), noCoupon = db.items.filter(couponTodo);
  const prints = [...db.prints].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.created).localeCompare(String(a.created)));
  const dl = (list, f, st) => list.length ? `<div class="list">${list.map(it => { const s = st(it); return `<a class="srow" href="#/item/${it.id}">${thumb(it, 'mini')}<div class="sbody"><b>${esc(itemTitle(it))}</b><small>${esc(fdate(it[f]))}${s.d != null ? ` · ${s.d < 0 ? 'ended ' + plural(-s.d, 'day') + ' ago' : s.d === 0 ? 'today' : plural(s.d, 'day') + ' left'}` : ''}</small></div><span class="pill ${s.level}">${s.level === 'over' ? 'Ended' : s.level === 'soon' ? 'Soon' : 'Open'}</span></a>`; }).join('')}</div>` : '';
  return `${joinCoach()}${ppBanners()}${starterBanner()}
  <section class="card hero dash-hero"><div class="hero-top"><div><div class="eyebrow">Total spent</div><div class="big-num">${money(total, total >= 1000 ? 0 : 2)}</div><small class="muted">price paid, ${plural(db.items.filter(x => x.status !== 'Returned').length, 'purchase')}${noCoupon.length ? ' · before 1 coupon' : ''}</small></div></div>
    <div class="stats">${stat('Printers', fmt(act.filter(x => x.cat === 'printer').length))}${stat('Spools', fmt(spools.length))}${stat('Filament', fmt(kg, kg >= 10 ? 0 : 1), ' kg')}</div>
    <div class="row-actions"><button class="btn primary" data-act="add">${I.plus} Add</button><button class="btn" data-act="addPrint">${I.print} Log a print</button></div></section>
  ${rem.filter(r => r.level !== 'info').length ? `<section class="card"><div class="card-head"><h3>${I.bell} Heads up</h3><span class="tag warn">${fmt(rem.filter(r => r.level !== 'info').length)}</span></div><div class="list">${rem.filter(r => r.level !== 'info').slice(0, 6).map(r => `<a class="srow" href="#/item/${r.it.id}">${thumb(r.it, 'mini')}<div class="sbody"><b>${esc(itemTitle(r.it))}</b><small>${esc(r.t)}</small></div><span class="pill ${r.level}">${r.level === 'over' ? 'Ended' : r.kind === 'low' ? 'Low' : 'Soon'}</span></a>`).join('')}</div></section>` : ''}
  <section class="card"><div class="card-head"><h3>${I.shield} Price protection</h3>${pp.filter(ppOpen).length ? `<span class="tag accent">${fmt(pp.filter(ppOpen).length)} open</span>` : ''}</div>${dl(pp, 'ppUntil', ppState) || '<p class="muted" style="margin:0">No open windows. Add a “Price protection until” date to a purchase and it shows up here.</p>'}</section>
  <section class="card"><div class="card-head"><h3>${I.cal} Warranty</h3></div>${dl(war, 'warrantyEnd', warrantyState) || `<p class="muted" style="margin:0">No warranty dates yet.${db.items.some(x => x.cat === 'printer' && !x.warrantyEnd) ? ' Add your printer’s warranty end date from the receipt or the maker’s warranty page.' : ''}</p>`}</section>
  ${byCat.length ? `<section class="card"><div class="card-head"><h3>Spent by category</h3><a href="#/inv" class="link sm">Inventory ${I.right}</a></div>${bars(byCat, Math.max(...byCat.map(x => x[1]), 1), v => money0(v))}</section>` : ''}
  <section class="card"><div class="card-head"><h3>${I.spool} Filament on hand</h3><a href="#/filament" class="link sm">Spools ${I.right}</a></div>
    ${byMat.length ? `<div class="stats two" style="margin-bottom:12px">${stat('On hand', fmt(kg, 2), ' kg')}${stat('Value left', money(filVal, 0))}</div>
      <table class="cmp mat-t"><thead><tr><th>Material</th><th>Spools</th><th>kg</th><th>Value</th></tr></thead><tbody>${byMat.map(r => `<tr><td><a href="#/filament?m=${encodeURIComponent(r.m)}">${esc(r.m)}</a></td><td>${fmt(r.n)}</td><td>${fmt(r.g / 1000, 2)}</td><td>${money0(r.v)}</td></tr>`).join('')}</tbody></table>
      <p class="muted" style="font-size:.8rem;margin:8px 0 0">Value left = price paid × share of the spool still on it.</p>` : '<p class="muted" style="margin:0">No spools yet. <a href="#/filament">Add your filament</a> to track grams and $/kg.</p>'}</section>
  ${low.length ? `<section class="card"><div class="card-head"><h3>Low stock</h3><span class="tag warn">under ${fmt(lowG())} g</span></div><div class="list">${low.map(spoolRow).join('')}</div></section>` : ''}
  ${noPrice.length || noCoupon.length ? `<section class="card"><h3>Finish your records</h3><ul class="insights">${noCoupon.map(x => `<li class="warn"><span><b>${esc(itemTitle(x))}</b>: enter your coupon amount. <a href="#" data-act="editItem" data-id="${x.id}">Edit</a></span></li>`).join('')}${noPrice.length ? `<li class="warn">${plural(noPrice.length, 'item')} ${noPrice.length === 1 ? 'has' : 'have'} no price yet.</li>` : ''}</ul></section>` : ''}
  ${prints.length ? `<section class="card"><div class="card-head"><h3>${I.print} Recent prints</h3><a href="#/prints" class="link sm">Print log ${I.right}</a></div><div class="list">${prints.slice(0, 3).map(printRow).join('')}</div></section>` : ''}
  <section class="card"><h3>Recently added</h3><div class="list">${[...db.items].sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 4).map(x => isSpool(x) ? spoolRow(x) : itemRow(x)).join('')}</div></section>
  ${rzFoot()}`;
}
const INV = { c: '', q: '', retired: false };
function viewInv(params) {
  if (params.c !== undefined) INV.c = params.c;
  if (!db.items.length) return emptyState();
  const q = norm(INV.q);
  let list = db.items.filter(x => (INV.retired || active(x)) && (!INV.c || x.cat === INV.c));
  if (q) list = list.filter(x => q.split(' ').every(w => norm([x.name, x.brand, x.model, x.material, x.color, x.vendor, x.orderNo, x.location, x.notes, catL(x.cat)].join(' ')).includes(w)));
  const groups = CATS.map(([c, l]) => [c, l, list.filter(x => x.cat === c)]).filter(g => g[2].length);
  const retiredN = db.items.filter(x => !active(x)).length;
  return `<div class="page-title"><h2>Inventory</h2><button class="btn small primary" data-act="add">${I.plus} Add</button></div>
    <label class="search">${I.search}<input type="search" id="invq" value="${esc(INV.q)}" placeholder="Search name, material, store, order #…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search inventory"></label>
    <div class="vt-filter scroll" role="group" aria-label="Category">${[['', 'All'], ...CATS.map(c => [c[0], CAT_SHORT[c[0]]])].map(([k, l]) => `<label><input type="radio" name="invc" value="${k}" ${INV.c === k ? 'checked' : ''} data-invc><span>${l}<small>${fmt(db.items.filter(x => (INV.retired || active(x)) && (!k || x.cat === k)).length)}</small></span></label>`).join('')}</div>
    ${groups.length ? groups.map(([c, l, g]) => `<div class="vt-group"><h3>${esc(l)}</h3><span class="vt-rule"></span><small class="muted">${plural(g.length, c === 'filament' ? 'spool' : 'item')} · ${money0(spent(g))}</small></div>
      <div class="list">${g.sort((a, b) => String(a.orderDate || '').localeCompare(String(b.orderDate || '')) * -1).map(x => c === 'filament' ? spoolRow(x) : itemRow(x)).join('')}</div>`).join('')
      : `<div class="empty"><div class="big">No matches</div><p>Try another search${INV.c ? ' or show All' : ''}.</p></div>`}
    ${retiredN ? `<p class="muted center"><button class="btn small" data-act="toggleRetired">${INV.retired ? 'Hide' : 'Show'} ${plural(retiredN, 'used-up / sold / returned item')}</button></p>` : ''}`;
}
const FIL = { m: '', sort: 'left', all: false };
function viewFilament(params) {
  if (params.m !== undefined) FIL.m = params.m;
  const all = db.items.filter(isSpool), act = all.filter(active);
  const mats = [...groupBy(act, matOf)].sort((a, b) => b[1].length - a[1].length);
  let list = (FIL.all ? all : act).filter(x => !FIL.m || matOf(x) === FIL.m);
  list.sort(FIL.sort === 'left' ? (a, b) => leftG(a) - leftG(b) : FIL.sort === 'kg' ? (a, b) => (perKg(a) ?? 1e9) - (perKg(b) ?? 1e9) : (a, b) => matOf(a).localeCompare(matOf(b)) || String(a.color || '').localeCompare(String(b.color || '')));
  const kg = act.reduce((t, x) => t + leftG(x), 0) / 1000, val = act.reduce((t, x) => t + spoolValue(x), 0);
  const pk = act.map(perKg).filter(v => v != null), avg = pk.length ? pk.reduce((t, v) => t + v, 0) / pk.length : null;
  return `<div class="page-title"><h2>Filament</h2><button class="btn small primary" data-act="addSpool">${I.plus} Spool</button></div>
    <section class="card hero"><div class="stats">${stat('On hand', fmt(kg, 2), ' kg')}${stat('Value left', money(val, 0))}${stat('Avg $/kg', avg != null ? money(avg, 2) : '—')}</div>
      ${act.filter(isLow).length ? `<p class="ratio warn" style="margin:10px 0 0">${plural(act.filter(isLow).length, 'spool')} under ${fmt(lowG())} g. <a href="#/more">Change the low-stock level</a></p>` : ''}</section>
    ${all.length ? `<div class="vt-filter scroll" role="group" aria-label="Material"><label><input type="radio" name="film" value="" ${!FIL.m ? 'checked' : ''} data-film><span>All<small>${fmt(act.length)}</small></span></label>${mats.map(([m, l]) => `<label><input type="radio" name="film" value="${esc(m)}" ${FIL.m === m ? 'checked' : ''} data-film><span>${esc(m)}<small>${fmt(l.length)}</small></span></label>`).join('')}</div>
      <div class="seg scope" role="radiogroup" aria-label="Sort">${[['left', 'Least left'], ['kg', '$/kg'], ['mat', 'Material']].map(([k, l]) => `<label><input type="radio" name="fils" value="${k}" ${FIL.sort === k ? 'checked' : ''} data-fils><span>${l}</span></label>`).join('')}</div>
      <div class="list">${list.map(spoolRow).join('') || '<div class="empty"><div class="big">No spools here</div></div>'}</div>
      ${all.length > act.length ? `<p class="muted center"><button class="btn small" data-act="toggleFilAll">${FIL.all ? 'Hide' : 'Show'} ${plural(all.length - act.length, 'used-up spool')}</button></p>` : ''}`
      : `<div class="empty"><div class="big">No spools yet</div><p>Add each spool with its price, and Print Crizib tracks grams left, $/kg and when you dried it.</p><div class="btn-row"><button class="btn primary" data-act="addSpool">${I.plus} Add a spool</button></div></div>`}
    ${guideCard(true)}`;
}
const stars = n => `<span class="stars" aria-label="${n} of 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
function guideCard(compact) {
  const rows = compact ? GUIDE.filter(g => ['PLA', 'PETG', 'ASA', 'PC', 'PA-CF / PAHT-CF'].includes(g.m)) : GUIDE;
  return `<section class="card guide" id="guide"><div class="card-head"><h3>${I.spool} Material guide</h3>${compact ? `<a href="#/guide" class="link sm">Full guide ${I.right}</a>` : ''}</div>
    <p class="guide-lead"><b>Want strong, metal-like functional parts?</b> PLA is the easiest to print but the weakest with heat. <b>PETG</b> is the easy step up. <b>ASA</b> and <b>PC</b> are tougher and handle heat better, and the carbon-fiber nylons (<b>PA-CF / PAHT-CF</b>) rate highest for heat and stiffness in Bambu’s own chart. Those engineering materials want an enclosed printer, a hardened-steel nozzle for CF/GF, and dry filament. <b>PLA Metal</b> only <i>looks</i> like metal: Bambu rates it the same as PLA.</p>
    <div class="tbl-wrap"><table class="cmp guide-t"><thead><tr><th>Material</th><th>Heat</th><th>Impact</th><th>Strength</th>${compact ? '' : '<th>Printer</th><th>Hardened nozzle</th><th>AMS</th><th>Dry first</th><th>Nozzle °C</th>'}</tr></thead>
    <tbody>${rows.map(g => `<tr><td><b>${esc(g.m)}</b>${!compact && g.note ? `<small>${esc(g.note)}</small>` : ''}</td><td>${stars(g.h)}</td><td>${stars(g.i)}</td><td>${stars(g.t)}</td>${compact ? '' : `<td>${esc(g.enc)}</td><td>${esc(g.hard)}</td><td>${esc(g.ams)}</td><td>${esc(g.dry)}</td><td>${esc(g.noz)}</td>`}</tr>`).join('')}</tbody></table></div>
    <p class="muted src">Stars are Bambu Lab’s own 1–5 ratings for heat deflection, impact resistance and tensile strength${compact ? '' : '; nozzle temperatures are Bambu’s ranges (±10 °C). Always check your spool’s label too'}. Source: <a href="${GUIDE_URL}" target="_blank" rel="noopener">Bambu Lab Wiki filament guide</a>. Bambu’s store notes the P2S and X2D have a hardened nozzle for carbon-fiber composites (<a href="https://us.store.bambulab.com/collections/3d-printer" target="_blank" rel="noopener">bambulab.com</a>).</p></section>`;
}
function viewGuide() { return `<a href="#/filament" class="back">${I.back} Filament</a>${guideCard(false)}`; }
function printRow(p) {
  const s = p.spoolId && itemById(p.spoolId);
  return `<a class="entry" href="#/print/${p.id}">${p.photos && p.photos[0] ? `<span class="ph"><img data-ph="${esc(p.photos[0])}" alt="Photo of ${esc(p.name)}" width="56" height="56"></span>` : comicIcon({ _k: 'part', ...(s ? { cat: 'filament', colorHex: s.colorHex } : {}) })}<div class="e-main"><b>${esc(p.name)}</b><div class="e-sub">${esc([fdate(p.date), s ? spoolTitle(s) : ''].filter(Boolean).join(' · '))}</div>
    <div class="tags"><span class="tag ${p.result === 'Failed' ? 'warn' : 'good'}">${esc(p.result || 'Success')}</span>${num(p.hours) ? `<span class="tag">${esc(hrs(p.hours))}</span>` : ''}</div></div>
    <div class="e-side"><b>${num(p.grams) ? fmt(p.grams) + ' g' : '—'}</b><small>${s && num(p.grams) && perKg(s) != null ? money(perKg(s) * num(p.grams) / 1000) : ''}</small></div></a>`;
}
const hrs = h => { const m = Math.round(num(h) * 60); return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`; };
function viewPrints() {
  const list = [...db.prints].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.created).localeCompare(String(a.created)));
  const g = list.reduce((t, p) => t + (num(p.grams) || 0), 0), ok = list.filter(p => p.result !== 'Failed').length, h = list.reduce((t, p) => t + (num(p.hours) || 0), 0);
  return `<div class="page-title"><h2>Print log</h2><button class="btn small primary" data-act="addPrint">${I.plus} Print</button></div>
    <p class="muted lead">Optional. Log a print and its grams come off the spool you used.</p>
    ${list.length ? `<section class="card hero"><div class="stats">${stat('Prints', fmt(list.length))}${stat('Success', fmt(Math.round(ok / list.length * 100)), '%')}${stat('Filament', fmt(g / 1000, 2), ' kg')}</div>${h ? `<p class="muted" style="margin:10px 0 0">${esc(hrs(h))} of printing logged</p>` : ''}</section><div class="list">${list.map(printRow).join('')}</div>`
      : `<div class="empty"><div class="big">No prints logged</div><p>Track what you printed, how much filament it took and whether it worked.</p><div class="btn-row"><button class="btn primary" data-act="addPrint">${I.plus} Log a print</button></div></div>`}`;
}
function viewPrint(id) {
  const p = printById(id); if (!p) return `<a href="#/prints" class="back">${I.back} Print log</a><div class="empty"><div class="big">Print not found</div></div>`;
  const s = p.spoolId && itemById(p.spoolId), row = (l, v) => v ? `<div class="kv"><span>${esc(l)}</span><b>${v}</b></div>` : '';
  return `<a href="#/prints" class="back">${I.back} Print log</a>
    <section class="card item-hero">${p.photos && p.photos.length ? `<div class="gallery">${p.photos.map((ph, i) => `<span class="ph ${i ? 'sm' : 'big'}"><img data-ph="${esc(ph)}" ${i ? '' : 'data-full="1"'} alt="Photo of ${esc(p.name)}"></span>`).join('')}</div>` : `<div class="ph-none">${comicIcon({ _k: 'part' }, 'hero-ic')}</div>`}
      <div class="eyebrow">Print · ${esc(fdate(p.date))}</div><h2>${esc(p.name)}</h2><div class="tags"><span class="tag ${p.result === 'Failed' ? 'warn' : 'good'}">${esc(p.result || 'Success')}</span></div>
      <div class="stats">${stat('Filament', num(p.grams) ? fmt(p.grams) + ' g' : '—')}${stat('Time', num(p.hours) ? hrs(p.hours) : '—')}${stat('Cost', s && num(p.grams) && perKg(s) != null ? money(perKg(s) * num(p.grams) / 1000) : '—')}</div>
      <div class="row-actions"><button class="btn primary" data-act="editPrint" data-id="${p.id}">${I.edit} Edit</button><button class="btn" data-act="dupPrint" data-id="${p.id}">${I.copy} Print again</button></div></section>
    <section class="card"><h3>Details</h3>${row('Spool', s ? `<a href="#/item/${s.id}">${esc(spoolTitle(s))}</a>` : '')}${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ''}</section>`;
}
function viewItem(id) {
  const it = itemById(id); if (!it) return `<a href="#/inv" class="back">${I.back} Inventory</a><div class="empty"><div class="big">Item not found</div><p>It may have been deleted on another device.</p></div>`;
  const pp = ppState(it), w = warrantyState(it), c = lineCost(it), sp = isSpool(it);
  const row = (l, v) => v ? `<div class="kv"><span>${esc(l)}</span><b>${v}</b></div>` : '';
  const back = sp ? `<a href="#/filament" class="back">${I.back} Filament</a>` : `<a href="#/inv" class="back">${I.back} Inventory</a>`;
  const used = db.prints.filter(p => p.spoolId === it.id);
  return `${back}
    ${ppOpen(it) ? `<div class="banner pp ${pp.level === 'soon' ? 'soon' : ''}" role="status"><span class="pp-ic">${I.shield}</span><span><b>Price protection open</b> until ${esc(fdate(it.ppUntil))} (${pp.d === 0 ? 'ends today' : plural(pp.d, 'day') + ' left'}). Keep an eye on ${esc(it.vendor || 'the store')}’s price; if it drops, you may be able to claim the difference.</span></div>` : ''}
    ${couponTodo(it) ? `<div class="banner soon" role="status"><span><b>Enter your coupon amount</b> so the price paid is right.</span><button class="btn small" data-act="editItem" data-id="${it.id}">Edit</button></div>` : ''}
    <section class="card item-hero">
      ${it.photos && it.photos.length ? `<div class="gallery">${it.photos.map((p, i) => `<span class="ph ${i ? 'sm' : 'big'}"><img data-ph="${esc(p)}" ${i ? '' : 'data-full="1"'} alt="Photo of ${esc(itemTitle(it))}"></span>`).join('')}</div>` : `<div class="ph-none">${comicIcon(it, 'hero-ic')}<button class="ph-empty" data-act="addPhoto" data-id="${it.id}">${I.camera}<span>Add a photo</span><small>It becomes the thumbnail everywhere</small></button></div>`}
      ${snapFor === it.id && !(it.photos && it.photos.length) ? `<div class="snap-prompt" role="status"><b>${I.camera} Snap a photo?</b><span>Saved ${esc(itemTitle(it))}. A quick photo makes it easy to spot in lists.</span><div class="row-actions"><button class="btn primary" data-act="addPhoto" data-id="${it.id}">${I.camera} Snap a photo</button><button class="btn" data-act="snapLater">Later</button></div></div>` : ''}
      <div class="eyebrow">${esc([it.brand, catL(it.cat)].filter(Boolean).join(' · '))}</div>
      <h2>${sp ? swatch(it) : ''}${esc(itemTitle(it))}</h2>${it.model ? `<p class="model">Model ${esc(it.model)}</p>` : ''}
      <div class="tags">${it.ppUntil ? pill(pp) : ''}${it.warrantyEnd ? pill(w) : ''}${!active(it) ? `<span class="tag warn">${esc(it.status)}</span>` : ''}${sp ? (it.ams ? '<span class="tag accent">AMS-compatible</span>' : '<span class="tag">Not for AMS</span>') : ''}${it.seed ? '<span class="tag">Starter item</span>' : ''}</div>
      ${sp ? `<div class="spool-meter">${gbar(it)}<div class="sm-row"><span><b>${fmt(leftG(it))} g</b> left of ${fmt(num(it.spoolG))} g</span><span>${Math.round(leftFrac(it) * 100)}%</span></div>
        <div class="qadj" role="group" aria-label="Quick adjust grams left">${[-100, -50, -10].map(n => `<button class="btn small" data-act="adj" data-id="${it.id}" data-n="${n}">${n} g</button>`).join('')}<button class="btn small" data-act="adj" data-id="${it.id}" data-n="10">+10 g</button><button class="btn small" data-act="setG" data-id="${it.id}">Set…</button></div></div>` : ''}
      <div class="stats">${stat('Paid', c != null ? money(c) : '—')}${sp ? stat('Per kg', perKg(it) != null ? money(perKg(it)) : '—') : stat('List', num(it.listPrice) != null ? money(num(it.listPrice)) : '—')}${stat('Coupon', num(it.coupon) != null ? money(num(it.coupon)) : couponTodo(it) ? 'Enter it' : '—')}</div>
      <div class="row-actions"><button class="btn primary" data-act="editItem" data-id="${it.id}">${I.edit} Edit</button>${sp ? `<button class="btn" data-act="dried" data-id="${it.id}">Dried today</button>` : ''}<button class="btn cam-btn" data-act="addPhoto" data-id="${it.id}" aria-label="Add a photo of ${esc(itemTitle(it))}">${I.camera} Photo</button></div></section>
    <section class="card"><h3>Purchase</h3>
      ${row('Store / vendor', esc(it.vendor || ''))}${row('Order date', it.orderDate ? esc(fdate(it.orderDate)) : '')}${row('Order #', it.orderNo ? `<span class="mono">${esc(it.orderNo)}</span>` : '')}
      ${row(sp ? 'Price per spool' : 'List / sale price', num(it.listPrice) != null ? esc(money(num(it.listPrice))) : '')}${row('Coupon / discount', num(it.coupon) != null ? '−' + esc(money(num(it.coupon))) : couponTodo(it) ? '<span class="warn-t">Enter your coupon amount</span>' : '')}
      ${row('Price paid', c != null ? esc(money(c)) + (it.paidManual ? ' <small class="muted">edited</small>' : '') : '')}${(num(it.qty) || 1) > 1 ? row('Quantity', fmt(it.qty)) : ''}
      ${row('Price protection', it.ppUntil ? `until ${esc(fdate(it.ppUntil))}${pp.d != null ? ` · ${pp.d < 0 ? 'ended' : pp.d === 0 ? 'ends today' : plural(pp.d, 'day') + ' left'}` : ''}` : '')}
      ${row('Warranty', it.warrantyEnd ? `until ${esc(fdate(it.warrantyEnd))}` : '<span class="muted">Add the end date</span>')}
      ${sp ? row('Material', esc([it.material, it.diameter ? it.diameter + ' mm' : ''].filter(Boolean).join(' · '))) + row('Color', esc(it.color || '')) + row('Opened', it.openedOn ? esc(fdate(it.openedOn)) : '') + row('Last dried', it.driedOn ? esc(fdate(it.driedOn)) + ` <small class="muted">${esc(ago(it.driedOn))}</small>` : '') + (used.length ? row('Prints', `${fmt(used.length)} · ${fmt(used.reduce((t, p) => t + (num(p.grams) || 0), 0))} g`) : '') : ''}
      ${row('Location', esc(it.location || ''))}
      ${it.notes ? `<p class="notes">${esc(it.notes)}</p>` : ''}
      ${it.receipt ? `<div class="fhead">Receipt</div><span class="ph receipt"><img data-ph="${esc(it.receipt)}" data-full="1" alt="Receipt"></span>` : ''}
      ${it.src ? `<p class="muted src">Product page: <a href="${esc(it.src)}" target="_blank" rel="noopener">${esc(new URL(it.src).hostname)}</a></p>` : ''}</section>
    <section class="card"><div class="btn-row">${it.ppUntil || it.warrantyEnd ? `<button class="btn small" data-act="ics" data-id="${it.id}">${I.cal} Add reminders to calendar</button>` : ''}<button class="btn small" data-act="dup" data-id="${it.id}">${I.copy} Add another like this</button>${sp ? `<button class="btn small" data-act="addPrint" data-spool="${it.id}">${I.print} Log a print</button>` : ''}</div></section>`;
}

/* ---------- export ---------- */
const CSV_COLS = [['Category', x => catL(x.cat)], ['Brand', x => x.brand], ['Name', x => x.name], ['Model / SKU', x => x.model], ['Material', x => x.material], ['Color', x => x.color], ['Qty', x => x.qty || 1],
  ['Store / vendor', x => x.vendor], ['Order date', x => x.orderDate], ['Order #', x => x.orderNo], ['List price', x => num(x.listPrice) != null ? num(x.listPrice).toFixed(2) : ''], ['Coupon', x => num(x.coupon) != null ? num(x.coupon).toFixed(2) : ''],
  ['Price paid', x => { const c = cost(x); return c == null ? '' : c.toFixed(2); }], ['Price protection until', x => x.ppUntil], ['Warranty ends', x => x.warrantyEnd], ['Spool g', x => isSpool(x) ? x.spoolG : ''], ['Grams left', x => isSpool(x) ? leftG(x) : ''],
  ['$/kg', x => isSpool(x) && perKg(x) != null ? perKg(x).toFixed(2) : ''], ['AMS', x => isSpool(x) ? (x.ams ? 'yes' : 'no') : ''], ['Opened', x => x.openedOn], ['Dried', x => x.driedOn], ['Location', x => x.location], ['Status', x => x.status], ['Notes', x => x.notes]];
const csvCell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' : s; };
function exportCSV() {
  const csv = [CSV_COLS.map(c => c[0]).join(','), ...db.items.map(x => CSV_COLS.map(c => csvCell(c[1](x))).join(','))].join('\r\n');
  download(`print-crizib-purchases-${todayISO()}.csv`, '\ufeff' + csv, 'text/csv'); toast(`CSV with ${plural(db.items.length, 'item')} downloaded`);
}
async function exportJSON(withPhotos) {
  const out = { app: 'Print Crizib', exported: new Date().toISOString(), ...db };
  if (withPhotos) { toast('Packing photos…'); const ids = new Set(db.items.flatMap(x => [...(x.photos || []), x.receipt]).concat(db.prints.flatMap(p => p.photos || [])).filter(Boolean)); out.photoData = {}; for (const r of await Photos.all()) if (ids.has(r.id)) out.photoData[r.id] = { full: await blobToData(r.full), thumb: await blobToData(r.thumb) }; }
  download(`print-crizib-backup-${todayISO()}.json`, JSON.stringify(out)); toast('Backup downloaded');
}
async function importJSON(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || (j.app && j.app !== 'Print Crizib') || !Array.isArray(j.items)) throw new Error('not a Print Crizib backup');
    const inc = normalize(j);
    const ok = await ask({ title: 'Import this backup?', msg: `${plural(inc.items.length, 'item')} and ${plural(inc.prints.length, 'print')}. Items already here are kept; the newer copy of each one wins. A copy of your current data is saved first.`, buttons: [{ label: 'Import', value: true, cls: 'primary' }, { label: 'Cancel', value: false }] });
    if (!ok) return;
    try { localStorage.setItem(BAK, JSON.stringify(db)); } catch (e) { /* quota */ }
    for (const key of ['items', 'prints', 'custom']) for (const r of inc[key]) { const i = db[key].findIndex(x => x.id === r.id); if (i < 0) db[key].push(r); else if (String(r.updated || '') > String(db[key][i].updated || '')) db[key][i] = r; }
    let n = 0; for (const [id, p] of Object.entries(j.photoData || {})) { try { await Photos.putRaw({ id, full: await dataToBlob(p.full), thumb: await dataToBlob(p.thumb), t: Date.now() }); n++; } catch (e) { console.warn(e); } }
    save(); render(); toast(`Imported${n ? ` with ${plural(n, 'photo')}` : ''}`);
  } catch (e) { console.warn(e); toast('That file isn’t a Print Crizib backup'); }
}

/* ---------- reminders: calendar + notifications ---------- */
function icsFor(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const clean = s => String(s || '').replace(/[,;\\\n]/g, ' ');
  const ev = (it, date, what, alarm) => { const d = date.replace(/-/g, ''), nx = addDays(date, 1).replace(/-/g, '');
    return ['BEGIN:VEVENT', `UID:printcrizib-${what}-${it.id}@riznoss`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nx}`, `SUMMARY:${what === 'pp' ? 'Price protection ends' : 'Warranty ends'}: ${clean(itemTitle(it))}`, `DESCRIPTION:${clean([it.vendor, it.orderNo && 'Order ' + it.orderNo].filter(Boolean).join(' · '))}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${what === 'pp' ? 'Price protection ends soon: check the price' : 'Warranty ends in 30 days'}`, `TRIGGER:${alarm}`, 'END:VALARM', 'END:VEVENT'].join('\r\n'); };
  const evs = list.flatMap(it => [it.ppUntil && it.ppUntil >= todayISO() ? ev(it, it.ppUntil, 'pp', '-P3D') : '', it.warrantyEnd && it.warrantyEnd >= todayISO() ? ev(it, it.warrantyEnd, 'w', '-P30D') : '']).filter(Boolean);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RIZNOSS//Print Crizib//EN', 'CALSCALE:GREGORIAN', ...evs, 'END:VCALENDAR'].join('\r\n');
}
function notifyDue() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let sent = {}; try { sent = JSON.parse(localStorage.getItem('printcrizib:notified') || '{}'); } catch (e) { /* ignore */ }
  const due = reminders().filter(r => (r.level !== 'info') && (!sent[r.key] || Date.now() - sent[r.key] > 3 * 864e5)).slice(0, 3);
  due.forEach(r => { try { new Notification('Print Crizib: ' + itemTitle(r.it), { body: r.t, icon: 'icons/icon-192.png', tag: r.key }); sent[r.key] = Date.now(); } catch (e) { navigator.serviceWorker?.ready.then(reg => reg.showNotification('Print Crizib: ' + itemTitle(r.it), { body: r.t, icon: 'icons/icon-192.png', tag: r.key })).catch(() => {}); sent[r.key] = Date.now(); } });
  try { localStorage.setItem('printcrizib:notified', JSON.stringify(sent)); } catch (e) { /* ignore */ }
}
function updateBell() { const n = reminders().filter(r => r.level !== 'info' || r.kind === 'pp').length, b = $('#bellCount'); if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; } }

/* ---------- settings / about ---------- */
const rzFoot = () => `<a href="#/about" class="rz-foot"><img src="img/riznoss-crest-solid.webp" alt="" width="26" height="30" loading="lazy" decoding="async"><b>RIZNOSS · Chamber 03</b><span>Print Crizib v${APP_VERSION} · works offline · your data stays yours</span><i>Protect ya data.</i></a>`;
function viewMore() {
  const th = db.settings.theme || 'auto', perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `<div class="page-title"><h2>Settings</h2></div>
    <div id="syncCard">${window.PrintCrizibSync ? window.PrintCrizibSync.cardHTML() : ''}</div>
    <section class="card"><h3>Appearance</h3><div class="seg" role="radiogroup" aria-label="Theme">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<label><input type="radio" name="theme" value="${k}" ${th === k ? 'checked' : ''} data-theme-pick><span>${l}</span></label>`).join('')}</div></section>
    <section class="card"><h3>${I.spool} Filament</h3><label class="field"><span class="lbl">Low-stock alert under</span><div class="unit"><input type="number" inputmode="numeric" id="lowG" value="${esc(lowG())}" min="0" step="10"><em>g</em></div><small class="muted fhint">Spools with less than this left show as low on the dashboard.</small></label></section>
    <section class="card"><h3>${I.bell} Reminders</h3><p class="muted">Open price-protection windows, warranty end dates and low spools show on the dashboard. Print Crizib can also notify you when you open it, or put the dates in your calendar.</p>
      <div class="btn-row">${perm === 'default' ? `<button class="btn small primary" data-act="notif">Turn on notifications</button>` : perm === 'granted' ? '<span class="tag good">Notifications on</span>' : perm === 'denied' ? '<span class="tag">Notifications blocked in browser settings</span>' : ''}<button class="btn small" data-act="icsAll">${I.cal} All dates (.ics)</button></div></section>
    <section class="card"><h3>Data</h3><div class="btn-row"><button class="btn small primary" data-act="export">${I.download} Backup with photos</button><button class="btn small" data-act="exportLite">${I.download} Without photos</button><button class="btn small" data-act="import">${I.upload} Import</button><button class="btn small" data-act="csv">${I.doc} Purchases CSV</button></div>
      <div class="setting danger"><b>Danger zone</b><div><button class="btn small ghost-danger" data-act="eraseAll" ${db.items.length || db.prints.length ? '' : 'disabled'}>${I.trash} Erase all data on this device</button></div></div></section>
    <section class="card"><a class="srow" href="#/about"><span class="sicon rz"><img src="img/riznoss-crest-solid.webp" alt="" width="22" height="25"></span><div class="sbody"><b>About Print Crizib</b><small>RIZNOSS Chamber 03 · share the app</small></div>${I.right}</a></section>
    ${rzFoot()}`;
}
function viewAbout() {
  const synced = !!(window.PrintCrizibSync && window.PrintCrizibSync.status().signedIn);
  return `<a href="#/more" class="back">${I.back} Settings</a>
    <section class="card rz-about"><img src="img/riznoss-lockup.webp" alt="RIZNOSS" width="220" height="213" decoding="async">
      <p class="rz-ch">RIZNOSS presents · Chamber 03</p><h2>Print Crizib</h2><p class="rz-alias">The Filament Forge</p>
      <p class="rz-copy">Every printer, spool and purchase: what you paid, the coupon you used, when price protection and warranty run out, and grams left on every spool. On your own device, no ads, no tracking. Sync only happens if you sign in.</p>
      <div class="rz-meta"><div><span>Version</span><b>v${APP_VERSION}</b></div><div><span>Your data</span><b>${synced ? 'This device + your account' : 'This device only'}</b></div><div><span>Items</span><b>${fmt(db.items.length)}</b></div><div><span>Prints</span><b>${fmt(db.prints.length)}</b></div></div>
      <div class="rz-sign">Protect ya data.</div></section>
    <section class="card" id="icons"><h3>Comic icon set</h3><p class="muted" style="margin:6px 0 12px">When an item has no photo, it gets one of these. Same RIZNOSS blue for every brand; the corner tag shows the brand (green for Bambu Lab, silver for others), and spools get a color dot.</p>
      <div class="ci-sheet">${CI_KEYS.map(k => `<figure>${comicIcon({ _k: k, brand: k === 'printer' || k === 'ams' ? 'Bambu Lab' : '' })}<figcaption>${esc(CI_LABEL[k])}</figcaption></figure>`).join('')}</div></section>
    <section class="card"><h3>Share Print Crizib</h3><p class="muted" style="margin:6px 0 10px">Send the invite page. It walks people through opening it in Safari, adding it to their Home Screen and signing up.</p><div class="btn-row"><button class="btn small primary" data-act="shareApp">${I.share} Share Print Crizib</button></div><p class="muted" style="font-size:.8rem;margin:8px 0 0;word-break:break-all">${JOIN_URL}</p></section>
    <section class="card"><h3>Sources</h3><p class="muted" style="margin:6px 0 0">Bambu Lab product names in the quick-pick come from the Bambu Lab US store’s public product list (no prices stored). The material guide quotes the <a href="${GUIDE_URL}" target="_blank" rel="noopener">Bambu Lab Wiki filament guide</a>. Bambu Lab, AMS and product names are trademarks of their owners; Print Crizib isn’t affiliated with Bambu Lab.</p></section>
    <section class="card"><h3>Also from RIZNOSS</h3><a class="srow" href="../autolog/"><span class="sicon">${svg('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/>')}</span><div class="sbody"><b>AutoLog · Chamber 01</b><small>Fuel, maintenance and cost of ownership</small></div>${I.right}</a>
      <a class="srow" href="../toolcrizib/"><span class="sicon">${svg('<path d="M3 7h11l2 2v3H9l-1 2H6l1-2H3z"/><path d="M16 9h3"/><path d="M8 14l-1 7h4l1-7"/>')}</span><div class="sbody"><b>Tool Crizib · Chamber 02</b><small>Power tools and batteries</small></div>${I.right}</a></section>`;
}
const JOIN_URL = 'https://bigriznizzle.github.io/printcrizib/join/';
(function () { try { if (/[?&]join(=[^&]*)?(&|$)/.test(location.search)) { sessionStorage.setItem('printcrizib:join', '1'); const q = location.search.slice(1).split('&').filter(x => x && !/^join(=|$)/.test(x)).join('&'); history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } } catch (e) { /* ignore */ } })();
const isStandalone = () => navigator.standalone === true || !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function joinCoach() {
  let on = false; try { on = sessionStorage.getItem('printcrizib:join') === '1'; } catch (e) { /* ignore */ }
  if (!on || isStandalone()) return '';
  const how = isIOS() ? 'Tap <b>Share</b> (the square with the arrow; tap <b>•••</b> first if you don’t see it), then <b>Add to Home Screen</b>, then <b>Add</b>.' : /Android/i.test(navigator.userAgent) ? 'Tap Chrome’s <b>⋮</b> menu, then <b>Install app</b> (or <b>Add to Home screen</b>).' : 'Use your browser’s <b>Install</b> option, or just use it here.';
  return `<section class="card join-coach"><div class="card-head"><h3>📲 Almost there</h3><button type="button" class="btn small" data-act="joinDone" aria-label="Dismiss">✕</button></div><p>${how}</p><p class="muted" style="margin:6px 0 0">Then open Print Crizib from your Home Screen. To create an account, go to <b>Settings</b> → <b>Account &amp; sync</b>.</p></section>`;
}
async function shareApp() {
  const data = { title: 'Print Crizib · RIZNOSS Chamber 03', text: 'Print Crizib tracks your 3D printers, filament and every purchase: coupons, price protection, warranty, grams left. Free, private, works offline.', url: JOIN_URL };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(JOIN_URL); toast('Invite link copied'); } catch (e) { prompt('Copy this link:', JOIN_URL); }
}
function showSplash() {
  try { if (sessionStorage.getItem('printcrizib:splash') || /[?&]nosplash\b/.test(location.search)) return; sessionStorage.setItem('printcrizib:splash', '1'); } catch (e) { return; }
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div'); el.className = 'rz-splash'; el.setAttribute('role', 'presentation');
  el.innerHTML = `<div class="rz-in"><img src="img/riznoss-lockup.webp" alt="RIZNOSS" width="236" height="228" decoding="async"><p class="rz-presents"><b>RIZNOSS</b> presents · Chamber 03</p><p class="rz-app">Print Crizib</p><p class="rz-alias2">The Filament Forge</p></div><div class="rz-skip">Tap to skip</div>`;
  let done = false; const close = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), reduce ? 0 : 380); document.removeEventListener('keydown', close, true); };
  el.addEventListener('pointerdown', close); document.addEventListener('keydown', close, true);
  document.body.appendChild(el); setTimeout(close, reduce ? 900 : 1600);
}

/* ---------- starter item: only on a brand-new install (fixed id, so a second device doesn't duplicate it) ---------- */
const SEED_ID = 'starter-p2s-combo';
function seedStarter() {
  let seeded = false; try { seeded = !!localStorage.getItem(SEEDED); } catch (e) { return; }
  if (!FRESH || seeded || db.items.length) { try { if (!seeded) localStorage.setItem(SEEDED, '1'); } catch (e) { /* ignore */ } return; }
  const t = '2026-11-04T00:00:00.000Z';
  db.items.push({ id: SEED_ID, seed: 1, short: 'P2S Combo', cat: 'printer', brand: 'Bambu Lab', name: 'Bambu Lab P2S Combo (with AMS 2 Pro)', model: 'P2S Combo', qty: 1, icon: 'printer',
    vendor: 'Bambu Lab US store', orderDate: '2026-11-03', listPrice: 649, coupon: null, paid: null, paidManual: false, couponTodo: true, orderNo: '', ppUntil: '2026-12-03', warrantyEnd: '',
    location: '', status: 'Active', photos: [], receipt: '', notes: 'Black Friday sale. $649 before the coupon.', src: 'https://us.store.bambulab.com/products/p2s', catId: 'bb:p2s', created: t, updated: t });
  try { localStorage.setItem(SEEDED, '1'); } catch (e) { /* ignore */ }
  save();
}

/* ---------- router / render ---------- */
const TABS = { dash: 'dash', inv: 'inv', item: 'inv', filament: 'filament', guide: 'filament', prints: 'prints', print: 'prints', more: 'more', about: 'more' };
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'dash';
  const [path, qs] = h.split('?'), [name, arg] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { name: TABS[name] ? name : 'dash', arg, params };
}
function applyTheme() {
  const t = db.settings.theme || 'auto', root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#themeColor')?.setAttribute('content', dark ? '#07090f' : '#f3f5f9');
}
let lastRoute = '', snapFor = null;
function render() {
  const r = route(), app = $('#app');
  const views = { dash: viewDash, inv: () => viewInv(r.params), item: () => viewItem(r.arg), filament: () => viewFilament(r.params), guide: viewGuide, prints: viewPrints, print: () => viewPrint(r.arg), more: viewMore, about: viewAbout };
  const key = location.hash;
  const y = key === lastRoute ? window.scrollY : 0;
  app.innerHTML = views[r.name]();
  if (r.name === 'item') { const it = itemById(r.arg); $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === (it && isSpool(it) ? 'filament' : 'inv'))); }
  else $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === TABS[r.name]));
  $('#fab').hidden = !['dash', 'inv', 'filament', 'prints'].includes(r.name) || (!db.items.length && r.name !== 'prints');
  Photos.sweep(); paintPhotos(app); updateBell();
  if (key !== lastRoute) { if (!scrollLock.isOn()) window.scrollTo(0, 0); }
  else if (!scrollLock.isOn()) window.scrollTo(0, y);
  lastRoute = key;
  const inv = $('#invq'); if (inv) inv.oninput = () => { INV.q = inv.value; clearTimeout(render.t); render.t = setTimeout(() => { const pos = inv.selectionStart; render(); const n = $('#invq'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } }, 160); };
  const lg = $('#lowG'); if (lg) lg.onchange = () => { const v = num(lg.value); db.settings.lowG = v == null ? 200 : Math.max(0, v); save(); toast('Saved'); };
}
const touch = it => { it.updated = new Date().toISOString(); };
const ACTIONS = {
  add: () => addFlow(), addSpool: () => addFlow({ cat: 'filament' }), addPrint: b => printForm(null, b && b.dataset.spool ? { spoolId: b.dataset.spool } : {}),
  editItem: b => { const it = itemById(b.dataset.id); if (it) itemForm(it); },
  editPrint: b => { const p = printById(b.dataset.id); if (p) printForm(p); },
  dupPrint: b => { const p = printById(b.dataset.id); if (!p) return; const { id, created, updated, photos, date, ...rest } = p; printForm(null, rest); },
  dup: b => { const it = itemById(b.dataset.id); if (!it) return; const { id, photos, receipt, created, updated, seed, short, couponTodo: ct, orderNo, remainG, openedOn, driedOn, ...rest } = it; itemForm(null, { ...rest, status: 'Active' }); },
  adj: b => { const it = itemById(b.dataset.id); if (!it) return; const n = Number(b.dataset.n); it.remainG = Math.max(0, Math.min(num(it.spoolG) || 1e9, leftG(it) + n)); if (!it.openedOn && n < 0) it.openedOn = todayISO(); if (leftG(it) === 0 && active(it)) it.status = 'Used up'; else if (it.status === 'Used up' && leftG(it) > 0) it.status = 'Active'; touch(it); save(); render(); toast(`${fmt(leftG(it))} g left`); },
  setG: b => { const it = itemById(b.dataset.id); if (!it) return; const v = prompt(`Grams left on this spool (0–${fmt(num(it.spoolG))})`, String(leftG(it))); if (v == null) return; const n = num(String(v).replace(/[^\d.]/g, '')); if (n == null) { toast('Enter a number of grams'); return; } it.remainG = Math.max(0, Math.min(num(it.spoolG) || 1e9, n)); if (leftG(it) === 0 && active(it)) it.status = 'Used up'; else if (it.status === 'Used up' && leftG(it) > 0) it.status = 'Active'; touch(it); save(); render(); toast(`${fmt(leftG(it))} g left`); },
  dried: b => { const it = itemById(b.dataset.id); if (!it) return; it.driedOn = todayISO(); touch(it); save(); render(); toast('Marked as dried today'); },
  addPhoto: b => { const it = itemById((b && b.dataset.id) || route().arg); if (!it) return; const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.multiple = true; f.onchange = async () => { let n = 0; for (const fl of f.files) { try { it.photos = [...(it.photos || []), await Photos.add(fl)]; n++; } catch (e) { toast('Couldn’t save that photo on this device. Private Browsing can’t keep photos.'); } } if (!n) return; snapFor = null; touch(it); save(); render(); toast(n === 1 ? 'Photo added' : `${n} photos added`); }; f.click(); },
  snapLater: () => { snapFor = null; render(); },
  ics: b => { const it = itemById(b.dataset.id); if (!it) return; const c = icsFor([it]); if (!/VEVENT/.test(c)) { toast('No upcoming dates on this item'); return; } download(`print-crizib-${norm(it.model || it.name || 'item').replace(/\s/g, '-')}.ics`, c, 'text/calendar'); },
  icsAll: () => { const l = db.items.filter(x => active(x) && ((x.ppUntil && x.ppUntil >= todayISO()) || (x.warrantyEnd && x.warrantyEnd >= todayISO()))); if (!l.length) { toast('No upcoming dates yet'); return; } download(`print-crizib-dates-${todayISO()}.ics`, icsFor(l), 'text/calendar'); toast(`${plural(l.length, 'item')} exported`); },
  notif: async () => { try { const p = await Notification.requestPermission(); if (p === 'granted') { toast('Notifications on'); notifyDue(); } render(); } catch (e) { toast('This browser can’t show notifications'); } },
  csv: exportCSV, export: () => exportJSON(true), exportLite: () => exportJSON(false), import: () => $('#importFile').click(),
  toggleRetired: () => { INV.retired = !INV.retired; render(); }, toggleFilAll: () => { FIL.all = !FIL.all; render(); },
  eraseAll: async () => { const ok = await ask({ title: 'Erase all data?', msg: 'This deletes every item, spool, print and photo on this device. If you’re signed in, your account keeps a copy until you sync this change.', typeToConfirm: 'ERASE', buttons: [{ label: 'Erase everything', value: true, cls: 'danger', needsType: 1 }, { label: 'Cancel', value: false }] }); if (ok) { try { localStorage.setItem(BAK, JSON.stringify(db)); } catch (e) { /* quota */ } (await Photos.all()).forEach(r => Photos.del(r.id)); db = { ...blank(), settings: db.settings }; save(); render(); toast('All data erased'); } },
  shareApp: () => shareApp(), joinDone: () => { try { sessionStorage.removeItem('printcrizib:join'); } catch (e) { /* ignore */ } render(); },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && ACTIONS[b.dataset.act]) { e.preventDefault(); ACTIONS[b.dataset.act](b); }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-invc]')) { INV.c = e.target.value; history.replaceState(null, '', '#/inv'); render(); }
  else if (e.target.matches('[data-film]')) { FIL.m = e.target.value; history.replaceState(null, '', '#/filament'); render(); }
  else if (e.target.matches('[data-fils]')) { FIL.sort = e.target.value; render(); }
  else if (e.target.matches('[data-theme-pick]')) { db.settings.theme = e.target.value; save(); applyTheme(); }
  else if (e.target.id === 'importFile') { const f = e.target.files[0]; e.target.value = ''; if (f) importJSON(f); }
});
$('#fab').addEventListener('click', () => { const n = route().name; if (n === 'prints') printForm(); else addFlow(n === 'filament' ? { cat: 'filament' } : {}); });
window.addEventListener('hashchange', render);
window.addEventListener('storage', e => { if (e.key === KEY) { db = load() || blank(); render(); } });
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

/* ---------- service worker + update prompt ---------- */
let swUpdating = false;
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const show = () => { const b = $('#updateBar'); b.hidden = false; b.onclick = () => { swUpdating = true; b.textContent = 'Updating…'; (reg.waiting || reg.installing)?.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => location.reload(), 4000); }; };
    if (reg.waiting && navigator.serviceWorker.controller) show();
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(); }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(e => console.warn('sw', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (swUpdating) location.reload(); });
}

/* ---------- public API for sync.js + tests ---------- */
window.PrintCrizibApp = {
  getDb: () => db, replaceDb: d => { db = normalize(d); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Couldn’t save synced data. Storage may be full.'); } render(); },
  toast, render, loadCatalog, Photos, version: APP_VERSION, iconKey, CI_KEYS, CI_LABEL, normalize, cost, perKg, SEED_ID,
};
seedStarter(); applyTheme(); showSplash(); render(); registerSW();
setTimeout(notifyDue, 2500);
