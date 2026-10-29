/**
 * Detects collection slots in one or more screenshots and writes a debug image
 * per input plus raw slot crops, for checking detection on new screenshots.
 *
 * node detectAndExtractBlueprintTemplates.js <image> [image...]
 *
 * Output: debug/<name>.png, slots/<name>/slot_<i>.png
 */

const fs = require("fs");
const path = require("path");
const { cvReady, loadImageToMat, matToPng, detectSlots, cropSlot, drawDebug } = require("./slots");

const SLOT_SIZE = 128;

async function processImage(file) {
  const name = path.basename(file, path.extname(file));
  const { mat, canvas } = await loadImageToMat(file);
  const rects = detectSlots(mat);

  const slotsDir = path.join("slots", name);
  fs.mkdirSync(slotsDir, { recursive: true });
  rects.forEach((r, i) => {
    const crop = cropSlot(mat, r, SLOT_SIZE);
    fs.writeFileSync(path.join(slotsDir, `slot_${i}.png`), matToPng(crop));
    crop.delete();
  });

  fs.mkdirSync("debug", { recursive: true });
  fs.writeFileSync(path.join("debug", `${name}.png`), drawDebug(canvas, rects));
  mat.delete();

  const size = rects[0] ? `${rects[0].width}x${rects[0].height}` : "-";
  console.log(`${name}: ${rects.length} slots (${size})`);
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: node detectAndExtractBlueprintTemplates.js <image> [image...]");
    process.exit(1);
  }
  await cvReady();
  for (const file of files) await processImage(file);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
