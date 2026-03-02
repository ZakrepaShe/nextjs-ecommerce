/**
 * Blueprint Slot Auto-Detection + Recognition (OpenCV WASM, Node.js)
 *
 * npm install @techstark/opencv-js canvas
 * node index.js
 */

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// IMPORTANT: require FIRST, use AFTER onRuntimeInitialized
const cv = require("@techstark/opencv-js");

// ================= CONFIG =================

const INPUT_IMAGE = "test.jpg";
const DEBUG_OUTPUT = "debug_slots.png";
const SLOTS_DIR = "slots";
const TEMPLATES_DIR = "templates";
const MATCH_THRESHOLD = 0.75;


const MIN_AREA = 2500;
const MAX_AREA = 25000;
const MIN_ASPECT = 0.8;
const MAX_ASPECT = 1.2;

const POSITION_EPS = 6;
const SLOT_SIZE = 64;

// ========================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------- Image loading ----------

async function loadImageToMat(imagePath) {
  const img = await loadImage(imagePath);

  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const mat = cv.matFromImageData(imageData);

  return { mat, canvas };
}

// ---------- Template loading ----------
async function loadTemplates() {
  const templates = [];

  const files = fs
    .readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith(".png"));

  for (const file of files) {
    const img = await loadImage(path.join(TEMPLATES_DIR, file));

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const mat = cv.matFromImageData(imageData);

    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

    mat.delete();

    templates.push({
      name: path.basename(file, ".png"),
      mat: gray
    });
  }

  return templates;
}

// ---------- Slot matching ----------
function matchSlot(slotMat, templates) {
  const slotGray = new cv.Mat();
  cv.cvtColor(slotMat, slotGray, cv.COLOR_RGBA2GRAY);

  let best = {
    name: null,
    confidence: 0
  };

  for (const tpl of templates) {
    const result = new cv.Mat();

    cv.matchTemplate(
      slotGray,
      tpl.mat,
      result,
      cv.TM_CCOEFF_NORMED
    );

    const mm = cv.minMaxLoc(result);

    if (mm.maxVal > best.confidence) {
      best = {
        name: tpl.name,
        confidence: mm.maxVal
      };
    }

    result.delete();
  }

  slotGray.delete();

  return best;
}

// ---------- Match all slots ----------
function matchAllSlots(src, rects, templates) {
  const results = [];

  rects.forEach((r, i) => {
    const roi = src.roi(
      new cv.Rect(r.x, r.y, r.width, r.height)
    );

    const resized = new cv.Mat();
    cv.resize(
      roi,
      resized,
      new cv.Size(SLOT_SIZE, SLOT_SIZE),
      0,
      0,
      cv.INTER_AREA
    );

    const match = matchSlot(resized, templates);

    if (match.confidence >= MATCH_THRESHOLD) {
      results.push({
        slot: i,
        blueprint: match.name,
        confidence: Number(match.confidence.toFixed(3))
      });
    } else {
      results.push({
        slot: i,
        blueprint: null,
        confidence: Number(match.confidence.toFixed(3))
      });
    }

    roi.delete();
    resized.delete();
  });

  return results;
}

// ---------- Slot detection ----------

function detectSlots(src) {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  cv.Canny(blurred, edges, 50, 150);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  const rects = [];

  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const r = cv.boundingRect(cnt);

    const area = r.width * r.height;
    const aspect = r.width / r.height;

    if (
      area >= MIN_AREA &&
      area <= MAX_AREA &&
      aspect >= MIN_ASPECT &&
      aspect <= MAX_ASPECT
    ) {
      rects.push(r);
    }

    cnt.delete();
  }

  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();

  return dedupeAndSort(rects);
}

// ---------- Utilities ----------

function dedupeAndSort(rects) {
  const out = [];

  rects.forEach(r => {
    const exists = out.some(e =>
      Math.abs(e.x - r.x) < POSITION_EPS &&
      Math.abs(e.y - r.y) < POSITION_EPS
    );
    if (!exists) out.push(r);
  });

  return out.sort((a, b) => {
    const dy = a.y - b.y;
    return Math.abs(dy) > 10 ? dy : a.x - b.x;
  });
}

// ---------- Slot extraction ----------

function extractSlots(src, rects) {
  ensureDir(SLOTS_DIR);

  rects.forEach((r, i) => {
    const roi = src.roi(
      new cv.Rect(r.x, r.y, r.width, r.height)
    );

    const resized = new cv.Mat();
    cv.resize(
      roi,
      resized,
      new cv.Size(SLOT_SIZE, SLOT_SIZE),
      0,
      0,
      cv.INTER_AREA
    );

    const canvas = createCanvas(SLOT_SIZE, SLOT_SIZE);
    const ctx = canvas.getContext("2d");

    const imgData = ctx.createImageData(SLOT_SIZE, SLOT_SIZE);
    imgData.data.set(resized.data);
    ctx.putImageData(imgData, 0, 0);

    fs.writeFileSync(
      path.join(SLOTS_DIR, `slot_${i}.png`),
      canvas.toBuffer("image/png")
    );

    roi.delete();
    resized.delete();
  });
}

// ---------- Debug drawing ----------

function drawDebug(canvas, rects) {
  const ctx = canvas.getContext("2d");

  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "lime";

  rects.forEach((r, i) => {
    ctx.strokeRect(r.x, r.y, r.width, r.height);
    ctx.fillText(`${i}`, r.x + 4, r.y + 14);
  });

  fs.writeFileSync(DEBUG_OUTPUT, canvas.toBuffer("image/png"));
}

// ---------- Main ----------

async function main() {
  const { mat, canvas } = await loadImageToMat(INPUT_IMAGE);

  const rects = detectSlots(mat);
  console.log(`Detected ${rects.length} blueprint slots`);

  const templates = await loadTemplates();
  console.log(`Loaded ${templates.length} templates`);

  const matches = matchAllSlots(mat, rects, templates);

  // drawDebug(canvas, rects);

  mat.delete();

  console.log("🎯 MATCH RESULTS:");
  console.table(matches);
}

// 🚨 THIS IS REQUIRED 🚨
cv.onRuntimeInitialized = () => {
  console.log("✅ OpenCV WASM initialized");
  main().catch(console.error);
};
