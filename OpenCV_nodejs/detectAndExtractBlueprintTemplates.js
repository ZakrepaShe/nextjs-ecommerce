/**
 * Blueprint Slot Auto-Detection + Extraction (OpenCV WASM, Node.js)
 *
 * npm install @techstark/opencv-js canvas
 * node detectAndExtractBlueprintSlots.wasm.js
 */

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// IMPORTANT: require FIRST, use AFTER onRuntimeInitialized
const cv = require("@techstark/opencv-js");

// ================= CONFIG =================

const INPUT_IMAGE = "part2.png";
const DEBUG_OUTPUT = "debug_slots.png";
const SLOTS_DIR = "slots";

const MIN_AREA = 2500;
const MAX_AREA = 25000;
const MIN_ASPECT = 0.8;
const MAX_ASPECT = 1.2;

const POSITION_EPS = 6;
const SLOT_SIZE = 128;

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

  extractSlots(mat, rects);
  drawDebug(canvas, rects);

  mat.delete();

  console.log("✔ Slots extracted to /slots");
  console.log("✔ Debug image saved:", DEBUG_OUTPUT);
}

// 🚨 THIS IS REQUIRED 🚨
cv.onRuntimeInitialized = () => {
  console.log("✅ OpenCV WASM initialized");
  main().catch(console.error);
};
