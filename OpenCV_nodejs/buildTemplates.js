/**
 * Names blueprint slots on the Frozen Trail collection screenshot and writes
 * 128x128 in-game templates.
 *
 * Slots that match an existing template keep that id. The slots with no
 * template were named by comparing each crop to the new MetaForge icons.
 * Stencil swatches and design tiles do not match their MetaForge icons
 * closely enough to name safely, so this script does not write those.
 *
 * node buildTemplates.js
 */

const fs = require("fs");
const path = require("path");
const { cvReady, loadImageToMat, detectSlots, cropSlot, matToPng, cv } = require("./slots");

const SCREENSHOT = path.join("..", "..", "frozen-trail-refs", "tab_blueprints_91.png");
const TEMPLATES_DIR = path.join("..", "ecommerce", "public", "templates");
const MATCH_THRESHOLD = 0.8;

// Slots the old template set does not cover, checked against the 91/91 capture.
const MANUAL = {
  12: "crash-mat-blueprint",
  17: "utility-augment-t3-smoke-blueprint",
  19: "dolabra-blueprint",
  21: "white-flag-blueprint",
  25: "stiletto-blueprint",
  39: "banjo-blueprint",
  45: "advanced-camera-blueprint",
  46: "powered-descender-blueprint",
  55: "tether-launcher-blueprint",
  57: "grappling-hook-blueprint",
  61: "bantam-blueprint",
  64: "rascal-blueprint",
  65: "canto-blueprint",
  67: "emperor-gateway-conduit-blueprint",
  72: "surge-coil-blueprint",
  82: "blue-light-stick-blueprint",
  84: "extended-barrel-ii-blueprint",
  86: "extended-barrel-recipe",
  87: "yank-grenade-blueprint",
};

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

function score(slot, template) {
  const result = new cv.Mat();
  cv.matchTemplate(slot, template, result, cv.TM_CCOEFF_NORMED);
  const value = cv.minMaxLoc(result).maxVal;
  result.delete();
  return value;
}

async function main() {
  await cvReady();
  const { mat } = await loadImageToMat(SCREENSHOT);
  const rects = detectSlots(mat);
  if (rects.length !== 91) {
    throw new Error(`Expected 91 blueprint slots, found ${rects.length}`);
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".png"));
  const templates = [];
  for (const file of files) {
    const { mat: image } = await loadImageToMat(path.join(TEMPLATES_DIR, file));
    templates.push({ id: path.basename(file, ".png"), mat: centerGray(image) });
    image.delete();
  }

  const slots = rects.map((rect) => centerGray(cropSlot(mat, rect, 128)));
  const pairs = [];
  slots.forEach((slot, index) => {
    let best = { id: null, score: -1 };
    for (const template of templates) {
      const value = score(slot, template.mat);
      if (value > best.score) best = { id: template.id, score: value };
    }
    pairs.push({ index, ...best });
  });

  const assigned = new Map();
  const used = new Set();
  pairs
    .filter((pair) => pair.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .forEach((pair) => {
      if (used.has(pair.id) || MANUAL[pair.index]) return;
      used.add(pair.id);
      assigned.set(pair.index, pair.id);
    });

  for (const [index, id] of Object.entries(MANUAL)) {
    if (used.has(id)) {
      for (const [slot, name] of assigned) {
        if (name === id) assigned.delete(slot);
      }
    }
    used.add(id);
    assigned.set(Number(index), id);
  }

  if (assigned.size !== rects.length) {
    const missing = rects.map((_, i) => i).filter((i) => !assigned.has(i));
    throw new Error(`Unlabeled slots: ${missing.join(", ")}`);
  }

  const ids = [...assigned.values()];
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`Duplicate ids: ${dupes.join(", ")}`);

  let written = 0;
  for (const [index, id] of assigned) {
    const crop = cropSlot(mat, rects[index], 128);
    const png = matToPng(crop);
    crop.delete();
    const dest = path.join(TEMPLATES_DIR, `${id}.png`);
    const current = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    if (!current || !current.equals(png)) {
      fs.writeFileSync(dest, png);
      written++;
    }
  }

  console.log(`Labeled ${assigned.size} blueprints, wrote ${written} templates`);
  mat.delete();
  slots.forEach((slot) => slot.delete());
  templates.forEach((template) => template.mat.delete());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
