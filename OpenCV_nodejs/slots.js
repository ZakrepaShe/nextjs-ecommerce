/**
 * Shared OpenCV helpers: image loading and collection-grid slot detection.
 *
 * Slot detection is resolution independent: every roughly-square contour is a
 * candidate, and the most common candidate size wins. That keeps 50px slots
 * from a 1280px capture and 120px slots from a 4K capture alike, and rejects
 * icons, checkmarks and panel borders whose size differs from the grid.
 */

const { createCanvas, loadImage } = require("canvas");
const cv = require("@techstark/opencv-js");

const MIN_SLOT_SIDE = 28;
const MIN_ASPECT = 0.7;
const MAX_ASPECT = 1.3;
const SIZE_TOLERANCE = 0.12;

// The opencv-js module object is a thenable, so never resolve a Promise with it.
function cvReady() {
  return new Promise((resolve) => {
    if (cv.Mat) return resolve();
    cv.onRuntimeInitialized = () => resolve();
  });
}

async function loadImageToMat(source) {
  const img = await loadImage(source);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const mat = cv.matFromImageData(ctx.getImageData(0, 0, img.width, img.height));
  return { mat, canvas };
}

function matToPng(mat) {
  const rgba = new cv.Mat();
  if (mat.channels() === 1) cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA);
  else mat.copyTo(rgba);
  const canvas = createCanvas(rgba.cols, rgba.rows);
  const ctx = canvas.getContext("2d");
  const data = ctx.createImageData(rgba.cols, rgba.rows);
  data.data.set(rgba.data);
  ctx.putImageData(data, 0, 0);
  rgba.delete();
  return canvas.toBuffer("image/png");
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.width * a.height + b.width * b.height - inter);
}

function sameSize(a, b, tol = SIZE_TOLERANCE) {
  return (
    Math.abs(a.width - b.width) <= a.width * tol &&
    Math.abs(a.height - b.height) <= a.height * tol
  );
}

// Two edge passes: a soft one that catches faint tile borders on dark
// backgrounds, and a strong outer-contour pass that isolates whole tiles.
const EDGE_PASSES = [
  { blur: 3, low: 30, high: 90, mode: "RETR_LIST" },
  { blur: 5, low: 50, high: 150, mode: "RETR_EXTERNAL" },
];

function contourRects(gray, { blur, low, high, mode }) {
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(blur, blur), 0);
  cv.Canny(blurred, edges, low, high);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv[mode], cv.CHAIN_APPROX_SIMPLE);

  const rects = [];
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const r = cv.boundingRect(cnt);
    cnt.delete();
    rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
  }

  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  return rects;
}

function findCandidates(src) {
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  const all = EDGE_PASSES.flatMap((pass) => contourRects(gray, pass));
  gray.delete();

  const maxSide = Math.min(src.cols, src.rows) / 2;
  const rects = all.filter((r) => {
    const aspect = r.width / r.height;
    return (
      r.width >= MIN_SLOT_SIDE &&
      r.height >= MIN_SLOT_SIDE &&
      r.width <= maxSide &&
      aspect >= MIN_ASPECT &&
      aspect <= MAX_ASPECT
    );
  });

  // Tiles cut off by the screenshot edge can't be matched reliably.
  const inside = rects.filter(
    (r) => r.x > 1 && r.y > 1 && r.x + r.width < src.cols - 1 && r.y + r.height < src.rows - 1
  );
  // Contours nested in a somewhat larger candidate are icon parts, not tiles.
  return inside.filter(
    (r) =>
      !inside.some(
        (o) =>
          o.width >= r.width * 1.5 &&
          o.width <= r.width * 3 &&
          o.x <= r.x &&
          o.y <= r.y &&
          o.x + o.width >= r.x + r.width &&
          o.y + o.height >= r.y + r.height
      )
  );
}

function pickGridSize(rects) {
  let best = null;
  let bestScore = 0;
  for (const r of rects) {
    // Prefer the most common size; break ties toward larger rects so the
    // outer tile border beats inner icon/background contours.
    const count = rects.filter((o) => sameSize(r, o)).length;
    const score = count * 1e6 + r.width * r.height;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function dedupe(rects) {
  const sorted = [...rects].sort((a, b) => b.width * b.height - a.width * a.height);
  const out = [];
  for (const r of sorted) {
    if (!out.some((o) => iou(o, r) > 0.4)) out.push(r);
  }
  return out;
}

function sortRowMajor(rects) {
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const r of sorted) {
    const row = rows.find((rw) => Math.abs(rw[0].y - r.y) < r.height / 2);
    if (row) row.push(r);
    else rows.push([r]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x));
}

function detectSlots(src) {
  const candidates = findCandidates(src);
  if (candidates.length === 0) return [];

  const ref = pickGridSize(candidates);
  // Tile borders produce slightly different boxes (outer glow vs inner edge),
  // so accept a wider band around the reference before deduping.
  const grid = candidates.filter((r) => sameSize(ref, r, 0.2));
  const unique = dedupe(grid);

  // Normalise to the median size so every crop covers the same tile area.
  const median = (arr) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  const w = median(unique.map((r) => r.width));
  const h = median(unique.map((r) => r.height));
  const normalised = unique.map((r) => {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    return {
      x: Math.max(0, Math.round(cx - w / 2)),
      y: Math.max(0, Math.round(cy - h / 2)),
      width: Math.min(w, src.cols - Math.max(0, Math.round(cx - w / 2))),
      height: Math.min(h, src.rows - Math.max(0, Math.round(cy - h / 2))),
    };
  });

  return sortRowMajor(normalised);
}

// Blueprint tiles sit on a saturated blue grid. Design and stencil tiles
// put a rarity color in that same corner, which reads as less saturated.
function isBlueprintTile(mat) {
  const data = mat.data;
  const w = mat.cols;
  const h = mat.rows;
  let sat = 0;
  let n = 0;
  for (let y = Math.floor(h * 0.62); y < h * 0.92; y++) {
    for (let x = Math.floor(w * 0.62); x < w * 0.92; x++) {
      const i = (y * w + x) * 4;
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      sat += max === 0 ? 0 : (max - min) / max;
      n++;
    }
  }
  return sat / n >= 0.62;
}

function cropSlot(src, r, size) {
  const roi = src.roi(new cv.Rect(r.x, r.y, r.width, r.height));
  const out = new cv.Mat();
  cv.resize(roi, out, new cv.Size(size, size), 0, 0, cv.INTER_AREA);
  roi.delete();
  return out;
}

function drawDebug(canvas, rects, labels = []) {
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2;
  ctx.font = "bold 11px sans-serif";
  rects.forEach((r, i) => {
    ctx.strokeStyle = "lime";
    ctx.strokeRect(r.x, r.y, r.width, r.height);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    const text = labels[i] ?? String(i);
    ctx.fillRect(r.x, r.y + r.height - 13, ctx.measureText(text).width + 4, 13);
    ctx.fillStyle = "yellow";
    ctx.fillText(text, r.x + 2, r.y + r.height - 3);
  });
  return canvas.toBuffer("image/png");
}

module.exports = {
  cv,
  cvReady,
  loadImageToMat,
  matToPng,
  detectSlots,
  isBlueprintTile,
  cropSlot,
  drawDebug,
};
