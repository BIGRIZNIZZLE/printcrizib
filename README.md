# Print Crizib — RIZNOSS Chamber 03 · "The Filament Forge"

A free, offline-first 3D printing tracker (installable PWA). Live: https://bigriznizzle.github.io/printcrizib/ · invite page: https://bigriznizzle.github.io/printcrizib/join/

## What it tracks
- **Purchases** across Printers, Accessories/upgrades, Filament, Resin, Parts/spares, Consumables and Tools: vendor, order date, list price, coupon, price paid (auto = list − coupon, editable), order #, warranty end (reminders + .ics), price-protection-until (defaults to order date + 30 days for Bambu Lab store purchases, editable, banner while open), photos, notes, storage location.
- **Filament spools**: brand, material (or your own), color + swatch, spool weight, grams left with quick adjust (−100/−50/−10/+10/Set), price per spool, $/kg, opened/dried dates, AMS-compatible flag, low-stock alert (default under 200 g, change in Settings).
- **Print log** (optional): grams used come off the chosen spool; editing or deleting a print gives them back.
- **Dashboard**: total spent, value by category, filament on hand by material (kg + value), price-protection and warranty deadlines, low stock.
- **Material guide**: only facts from Bambu Lab's official filament guide (linked in the app); no invented numbers.
- **Bambu Lab quick-pick**: 95 product names from Bambu's public product sitemap (`tools/build-catalog.py`). Names only, no prices. Add your own products anytime.
- A starter item (P2S Combo with AMS 2 Pro, ordered 2026-11-03, $649 list, coupon to fill in) is added on a fresh install only. Edit or delete it like anything else.

## How it's built
Vanilla JS, no build step. `app.js` (UI + data), `sync.js` (optional Supabase sync), `sw.js` (versioned offline cache + update prompt), `catalog.json`, `icons/comic/*.webp`.
- Data: `localStorage` key `printcrizib:data:v1` (photos in IndexedDB `printcrizib-photos`). Older/unversioned data is backed up to `printcrizib:backup:v1:pre-v1` before an upgrade; corrupt data is kept in `printcrizib:backup:v1:corrupt`.
- Sync: AutoLog's Supabase project and `records` table (RLS per user). Rows are `kind='maint'`, id `pc:<item|print|custom>:<id>`, `data._vid='__printcrizib'`, so AutoLog keeps them as orphans and Tool Crizib (`tl:`) ignores them. Last write wins; deletes are tombstones. Only the publishable key is in the client.
- iOS: inputs ≥16px, scroll lock while sheets are open, `dvh` sizing, Add to Home Screen steps on /join/.

## Tests (serve `/workspace` on 127.0.0.1:8813)
`node tools/smoke.js` · `node tools/test-ios.js` · `node tools/test-migrate.js` · `node tools/test-offline.js` · `node tools/test-sync-compat.js` (needs AutoLog sync.js versions in /tmp/alsync) · `node tools/test-sync-live.js` (needs Management API access; creates and deletes `printcrizib-test-*@test.invalid` users) · `node tools/shots.js` (screenshots).

Protect ya data.
