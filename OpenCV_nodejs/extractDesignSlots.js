/**
 * Crops the Designs tab into public/templates/designs/slot_XX.png
 * and writes MATCH.md: in-game slots plus the MetaForge name/icon list.
 *
 * node extractDesignSlots.js
 */

const fs = require("fs");
const path = require("path");
const { cvReady, loadImageToMat, detectSlots, cropSlot, matToPng } = require("./slots");

const SCREENSHOT = path.join("..", "..", "frozen-trail-refs", "tab_designs_100.png");
const OUT_DIR = path.join("..", "ecommerce", "public", "templates", "designs");

function cell(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function main() {
  await cvReady();
  const { mat } = await loadImageToMat(SCREENSHOT);
  const rects = detectSlots(mat);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  rects.forEach((rect, index) => {
    const crop = cropSlot(mat, rect, 128);
    const name = `slot_${String(index).padStart(2, "0")}.png`;
    fs.writeFileSync(path.join(OUT_DIR, name), matToPng(crop));
    crop.delete();
  });
  mat.delete();

  const designs = require("./catalog.json").designs
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const slotRows = rects
    .map((_, index) => {
      const file = `slot_${String(index).padStart(2, "0")}.png`;
      return `| ${index} | ![slot ${index}](${file}) |`;
    })
    .join("\n");

  const catalogRows = designs
    .map(
      (item) =>
        `| ${cell(item.name)} | \`${item.id}\` | ![${cell(item.name)}](${item.icon}) |`
    )
    .join("\n");

  const markdown = `# Design matching

In-game crops are \`slot_00.png\` through \`slot_${String(rects.length - 1).padStart(2, "0")}.png\` in this folder, in the order they appear on the Designs tab. MetaForge lists ${designs.length} designs, so one design is not in the screenshot.

These files stay in \`public/templates/designs/\`. Recognition only loads PNGs directly inside \`public/templates/\`, so these crops are not matched yet. After you pair a slot with an id, the template name to use is \`<id>.png\`.

## In-game slots

| Slot | Image |
| --- | --- |
${slotRows}

## MetaForge designs

| Name | Id | Image |
| --- | --- | --- |
${catalogRows}
`;

  fs.writeFileSync(path.join(OUT_DIR, "MATCH.md"), markdown);
  console.log(`Wrote ${rects.length} slots and MATCH.md (${designs.length} designs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
