/**
 * Match a collection screenshot against in-game templates.
 *
 * node index.js <image>
 */

const fs = require("fs");
const path = require("path");
const { cvReady, loadImageToMat, detectSlots, cropSlot, isBlueprintTile, cv } = require("./slots");

const TEMPLATES_DIR = path.join("..", "ecommerce", "public", "templates");
const MATCH_THRESHOLD = 0.8;
const SLOT_SIZE = 128;

function centerGray(mat) {
  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  const w = Math.floor(gray.cols * 0.6);
  const h = Math.floor(gray.rows * 0.6);
  const roi = gray.roi(
    new cv.Rect(Math.floor((gray.cols - w) / 2), Math.floor((gray.rows - h) / 2), w, h)
  );
  const out = new cv.Mat();
  cv.resize(roi, out, new cv.Size(64, 64), 0, 0, cv.INTER_AREA);
  roi.delete();
  gray.delete();
  return out;
}

function templateFiles() {
  const dirs = [
    TEMPLATES_DIR,
    path.join(TEMPLATES_DIR, "designs"),
    path.join(TEMPLATES_DIR, "stencils"),
  ];
  return dirs.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".png"))
      .map((file) => path.join(dir, file));
  });
}

async function loadTemplates() {
  const templates = [];
  for (const file of templateFiles()) {
    const { mat } = await loadImageToMat(file);
    templates.push({ name: path.basename(file, ".png"), mat: centerGray(mat) });
    mat.delete();
  }
  return templates;
}

function matchSlot(slot, templates) {
  const gray = centerGray(slot);
  let best = { name: null, confidence: 0 };
  for (const template of templates) {
    const result = new cv.Mat();
    cv.matchTemplate(gray, template.mat, result, cv.TM_CCOEFF_NORMED);
    const confidence = cv.minMaxLoc(result).maxVal;
    result.delete();
    if (confidence > best.confidence) best = { name: template.name, confidence };
  }
  gray.delete();
  return best;
}

async function main() {
  const image = process.argv[2];
  if (!image) {
    console.error("Usage: node index.js <image>");
    process.exit(1);
  }
  await cvReady();
  const { mat } = await loadImageToMat(image);
  const rects = detectSlots(mat);
  const templates = await loadTemplates();
  const matches = rects.map((rect, slot) => {
    const crop = cropSlot(mat, rect, SLOT_SIZE);
    const match = matchSlot(crop, templates);
    const accepted =
      match.confidence >= MATCH_THRESHOLD &&
      (match.name?.endsWith("-design") ||
        match.name?.endsWith("-stencil") ||
        match.confidence >= 0.9 ||
        isBlueprintTile(crop));
    crop.delete();
    return {
      slot,
      blueprint: accepted ? match.name : null,
      confidence: Number(match.confidence.toFixed(3)),
    };
  });
  mat.delete();
  templates.forEach((template) => template.mat.delete());

  const named = matches.filter((match) => match.blueprint);
  const ids = named.map((match) => match.blueprint);
  const dupes = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  console.log(
    `${path.basename(image)}: ${rects.length} slots, ${named.length} matched` +
      (dupes.length ? `, duplicates: ${dupes.join(", ")}` : "")
  );
  console.table(matches);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
