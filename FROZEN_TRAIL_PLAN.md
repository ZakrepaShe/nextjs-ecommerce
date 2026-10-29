# Frozen Trail update — continuation plan

Handoff for the next pass. Do not re-research what is already settled below. Do not commit unless the user asks.

## Goal

Arc Raiders (Frozen Trail 2.0, 8 Oct 2026) split the old single blueprint screen into three in-game tabs. The tracker still syncs only `item_type=Blueprint` and the OpenCV recognizer only matches the old blueprint templates. Update every pipeline so Blueprints, Stencils, and Designs are synced, ordered, shown, and recognized from screenshots.

## Settled facts

- MetaForge endpoint is unchanged: `https://metaforge.app/api/arc-raiders/items?item_type=<type>&page=&limit=`. Pagination shape is `{ data, pagination: { total, hasNextPage } }`.
- Counts fetched on 29 Oct 2026: **Blueprint 91**, **Stencil 14**, **Design 101**. No duplicate ids across the three. Design is 101, not the 100 the patch notes advertise. Treat the API count as source of truth.
- The API has **no field for which in-game tab an item is on**. Tab membership is `item_type`: `Blueprint`, `Stencil`, `Design`.
- In-game screen header is three pills: `BLUEPRINTS | STENCILS | DESIGNS`, plus `FOUND: n/total`. Tile art is the same as before (blue grid, checkmark, book icon). Stencil tiles are taller than they are wide and have a colored rarity frame. Design tiles are square like blueprints.
- Existing templates in `ecommerce/public/templates/` are **128×128 crops of the whole in-game tile**, not MetaForge icons. There are 74 of them. 17 current blueprints have no template. Stencils and designs have none.
- User progress is one Mongo document per user: `users_blueprints.blueprints` is a map keyed by item id (`isFound`, `isFavorite`, `extraCount`). Order lives in `blueprints_order`. Hand-added placeholders live in `extra_blueprints` (`extra_1`, …).
- DB: `ecommerce-nextjs` via `ecommerce/app/api/db.ts`. Do not print or commit `.env.local`.

## Starting screenshots (already downloaded)

Ultrawide in-game captures of a completed account, from a public postimg gallery. Copied to:

- `c:\Users\SheZa\Desktop\ARC_BP_tracker\frozen-trail-refs\tab_blueprints_91.png` — BLUEPRINTS, FOUND 91/91, 1280×599
- `c:\Users\SheZa\Desktop\ARC_BP_tracker\frozen-trail-refs\tab_stencils_14.png` — STENCILS, FOUND 14/14, 1280×597
- `c:\Users\SheZa\Desktop\ARC_BP_tracker\frozen-trail-refs\tab_designs_100.png` — DESIGNS, FOUND 100/100, 1280×592 (one design is off-screen or not in that account; API has 101)

Older references, still useful as regression images:

- `frozen-trail-refs\reddit_all_bp_2026-09-17.png` — pre-update 83/83
- `Ice-cream update\` — two May 2026 phone photos, 79/81
- `OpenCV_nodejs\full.jpg`, `p2.jpg`, `photo2.jpg`, `test.jpg`
- `ecommerce\public\test_img\` — including a real 2026.02.04 game screenshot

## Already done in this session (uncommitted)

- `OpenCV_nodejs/categories.js` — `{ blueprints, stencils, designs }` → MetaForge `item_type`.
- `OpenCV_nodejs/fetchCatalog.js` — pages the API and writes `catalog.json` plus `icons/<category>/<id>.png`. Already run: 91 + 14 + 101 icons on disk.
- `OpenCV_nodejs/slots.js` — shared loader, resolution-independent slot detection, crop, debug draw. **Do not `resolve(cv)`**; the opencv-js export is a thenable and that hangs the promise forever. `cvReady()` resolves with no value.
- `OpenCV_nodejs/detectAndExtractBlueprintTemplates.js` — rewritten to take image paths and use `slots.js`. Writes `debug/<name>.png` and `slots/<name>/slot_N.png`.

Last detection run (before the two-pass edge change was re-tested):

| image | slots | expected |
| --- | --- | --- |
| tab_blueprints_91 | 91 | 91 |
| tab_stencils_14 | 14 | 14 |
| tab_designs_100 | 100 | 100 visible |
| reddit 83/83 | 83 | 83 |
| full.jpg | 77 | 77 |
| p2.jpg, ice-cream photos, Feb screenshot | full visible grids | ok |
| test.jpg, test2.jpg, test3.jpg | 0–2 | old detector found 1 each; these are tiny crops of a single tile |

`slots.js` was then edited to run two Canny passes (`RETR_LIST` 30/90 and `RETR_EXTERNAL` 50/150) so single-tile crops work again. **That edit has not been re-run.** First action is to re-run detection and confirm the counts above did not regress.

## Do this next, in order

### 1. Re-verify detection

From `OpenCV_nodejs`:

```
node detectAndExtractBlueprintTemplates.js ..\..\frozen-trail-refs\tab_blueprints_91.png ..\..\frozen-trail-refs\tab_stencils_14.png ..\..\frozen-trail-refs\tab_designs_100.png ..\..\frozen-trail-refs\reddit_all_bp_2026-09-17.png full.jpg ..\ecommerce\public\test_img\test.jpg ..\ecommerce\public\test_img\test2.jpg ..\ecommerce\public\test_img\test3.jpg
```

Pass condition: 91, 14, 100, 83, 77, and the three tiny crops each find their one full tile (not the icon inside it). Open `debug\tab_stencils_14.png` and `debug\tab_designs_100.png` and look at the boxes. If a pass regresses, fix `slots.js` before anything else.

### 2. Build templates from the three screenshots

Add `OpenCV_nodejs/buildTemplates.js`.

- Detect slots on each tab screenshot.
- Match each crop to the catalog icons for that category only. MetaForge icons are item art on transparency; in-game tiles are the same art on the blue grid with a checkmark and a book. Match the **center ~60%** of the tile (same idea as `extractCenterRegion` in `blueprint-recognizer-actions.ts`) against the icon, both converted to gray. Try `TM_CCOEFF_NORMED` first. If scores are weak, also try edges-only matching, because the grid lines dominate a raw gray match.
- Greedy assignment: best score wins, each icon used once. Print a table of slot index, assigned id, score, and any slot under a threshold.
- Expected: 91/91 blueprints, 14/14 stencils, 100/101 designs. The missing design is whichever icon never wins. Record its id; it will have no in-game template until the user supplies a screenshot that contains it.
- Write winners to `ecommerce/public/templates/<id>.png` at **128×128**, whole tile, matching the existing template style. Do not overwrite an existing file whose bytes already match. New blueprint ids that should appear: `advanced-camera-blueprint`, `banjo-blueprint`, `bantam-blueprint`, `canto-blueprint`, `crash-mat-blueprint`, `dolabra-blueprint`, `emperor-gateway-conduit-blueprint`, `extended-barrel-ii-blueprint`, `grappling-hook-blueprint`, `powered-descender-blueprint`, `rascal-blueprint`, `stiletto-blueprint`, `surge-coil-blueprint`, `tether-launcher-blueprint`, `utility-augment-t3-smoke-blueprint`, `white-flag-blueprint`, `yank-grenade-blueprint`. Confirm the exact missing set by diffing `catalog.json` blueprints against `public/templates`.
- Stencil tiles are not square (115×136 in the 1280 capture). Resize the whole tile into 128×128 the same way blueprints are, so one matcher serves all three tabs. Check a couple of stencil templates by eye; if the squash destroys the pattern, keep native aspect and teach the matcher to resize the template to the slot instead. Prefer one size if scores stay above ~0.8.

### 3. Recognition CLI

Replace `OpenCV_nodejs/index.js` so it uses `slots.js` + `public/templates` and prints the match table. Threshold stays 0.8. This is the fast loop for checking a screenshot without the Next server. `OpenCV_nodejs/list.json` is the old flat blueprint id list; stop using it. Category comes from the id suffix / catalog, not from that file.

### 4. App data model

Keep **one progress map** keyed by id. Ids do not collide, and found/favorite/extra already work per id. Add the category instead of a second user collection.

- `ecommerce/app/types.ts`: add `category: "blueprints" | "stencils" | "designs"` on `Blueprint`. `extra_*` placeholders have no category; treat them as blueprints.
- `ecommerce/app/actions/arc-blueprints-actions.ts`:
  - `fetchAllBlueprints` currently hardcodes `item_type=Blueprint`. Fetch all three types. Stamp `category` on each doc before upsert.
  - `syncBlueprints` returns early when `pagination.total` equals `counters.blueprints.total`. That misses a changed total on the other two types, and it misses icon/name edits when the count is unchanged. Compare the three totals (store `{ blueprints, stencils, designs }` on the counter) and still upsert when any total differs. Keep the existing order-merge behavior: preserve the admin's current order, append new API ids, keep `extra_*` ids.
  - `getUsersBlueprints` compares `counter.total` to the number of keys on the user doc. Change that comparison to "every non-extra blueprint id has a key", then insert missing keys with `isFound: false`. Do not wipe found flags.
  - `resetUserBlueprints` must reset stencil and design keys too, not only the `blueprints` collection.
- `getBlueprints` already merges API docs with `extra_blueprints`. Leave that merge. Extras stay on the blueprints tab.

### 5. UI: three tabs

The game shows one grid per tab. Mirror that.

- `ecommerce/app/arc-raiders/blueprints/Blueprints.tsx` and `ecommerce/app/arc-raiders/users/BlueprintsGrid.tsx`: tab row Blueprints / Stencils / Designs. Filter `blueprintsOrder` by the item's category. Header count is found/total **for the active tab**. Search stays within the tab.
- Upload and clear stay global: one screenshot only contains one tab, and clear still resets everything (the confirm copy should say blueprints, stencils, and designs).
- `ecommerce/app/admin/AdminBlueprints.tsx`: same tabs. Drag reorder only within the active tab, then splice that tab's ids back into the full order array so the other tabs' order is untouched. Sync button stays one action and syncs all three.
- `Blueprint.tsx` renders MetaForge `icon` on the blueprint background. That is correct for the tracker UI. Templates are only for recognition. No change needed there unless a stencil icon looks wrong; check one stencil and one design in the browser.

### 6. Recognizer server action

`ecommerce/app/actions/blueprint-recognizer-actions.ts` duplicates the old detector (fixed `MIN_AREA` 2500 / `MAX_AREA` 25000, which only fits ~50–160px tiles). Point it at the same algorithm as `slots.js`. The file is TypeScript loaded by Next, and `slots.js` is CommonJS in another folder, so copy the functions into the action (or a `ecommerce/app/actions/slots.ts`) rather than crossing the package boundary. Keep the center-crop preprocess and `MATCH_THRESHOLD` 0.8.

`useUpload.ts` already marks whatever ids come back as found. No hook change if the recognizer returns stencil and design ids the same way.

`next.config.mjs` `outputFileTracingIncludes` already traces `public/templates/**` for the blueprints and users routes. New template files are picked up by that glob. No config change unless a route is added.

### 7. Verify

- Run the recognition CLI on `tab_blueprints_91.png`, `tab_stencils_14.png`, `tab_designs_100.png`. Expect every visible slot matched, no id assigned twice.
- Run it on `reddit_all_bp_2026-09-17.png` and `full.jpg`. Expect the old blueprints still matched and no stencil/design false positives.
- `npm run dev` in `ecommerce`. Log in, open `/arc-raiders/blueprints`, confirm three tabs, counts, and that a click toggles found on each tab. Upload `tab_stencils_14.png` and confirm stencil ids flip to found without flipping blueprint ids. Repeat for one design screenshot on the designs tab.
- Admin page: Sync, then confirm new ids land and drag reorder on one tab does not reshuffle the others.

## Leave alone

- `extra_blueprints` placeholders and their empty tiles.
- Favorite star and extra-count controls.
- Mongo connection string and `.env.local`.
- Generated junk: `OpenCV_nodejs/debug/`, `OpenCV_nodejs/slots/`, `OpenCV_nodejs/icons/`, `OpenCV_nodejs/catalog.json`, `frozen-trail-refs/`. Do not commit those. Do commit new files under `ecommerce/public/templates/`.
