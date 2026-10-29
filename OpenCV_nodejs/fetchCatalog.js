/**
 * Downloads the MetaForge catalog for every in-game collection tab
 * (Blueprints, Stencils, Designs) together with item icons.
 *
 * node fetchCatalog.js
 *
 * Output:
 *   catalog.json               { blueprints: Item[], stencils: Item[], designs: Item[] }
 *   icons/<category>/<id>.png
 */

const fs = require("fs");
const path = require("path");
const { CATEGORIES } = require("./categories");

const API = "https://metaforge.app/api/arc-raiders/items";
const ICONS_DIR = "icons";

async function fetchAll(itemType) {
  const items = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = `${API}?item_type=${encodeURIComponent(itemType)}&page=${page}&limit=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
    const json = await res.json();
    items.push(...json.data);
    hasNextPage = json.pagination.hasNextPage;
    page++;
  }

  return items;
}

async function downloadIcon(item, dir) {
  const file = path.join(dir, `${item.id}.png`);
  if (!item.icon || fs.existsSync(file)) return;
  const res = await fetch(item.icon);
  if (!res.ok) {
    console.warn(`  icon failed for ${item.id}: ${res.status}`);
    return;
  }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const catalog = {};

  for (const [category, { itemType }] of Object.entries(CATEGORIES)) {
    const items = await fetchAll(itemType);
    catalog[category] = items;
    console.log(`${category}: ${items.length} items`);

    const dir = path.join(ICONS_DIR, category);
    fs.mkdirSync(dir, { recursive: true });
    for (const item of items) await downloadIcon(item, dir);
  }

  fs.writeFileSync("catalog.json", JSON.stringify(catalog, null, 2));
  console.log("Saved catalog.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
