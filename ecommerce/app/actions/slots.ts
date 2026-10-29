// Same detector as OpenCV_nodejs/slots.js. Keep the two copies in step:
// the CLI is not part of the Next deployment.

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
const cv = require("@techstark/opencv-js");

const MIN_SLOT_SIDE = 28;
const MIN_ASPECT = 0.7;
const MAX_ASPECT = 1.3;
const SIZE_TOLERANCE = 0.12;

export type SlotRect = { x: number; y: number; width: number; height: number };

const EDGE_PASSES = [
  { blur: 3, low: 30, high: 90, mode: "RETR_LIST" },
  { blur: 5, low: 50, high: 150, mode: "RETR_EXTERNAL" },
];

function contourRects(gray: any, pass: (typeof EDGE_PASSES)[number]) {
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(pass.blur, pass.blur), 0);
  cv.Canny(blurred, edges, pass.low, pass.high);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv[pass.mode],
    cv.CHAIN_APPROX_SIMPLE
  );

  const rects: SlotRect[] = [];
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

function sameSize(a: SlotRect, b: SlotRect, tol = SIZE_TOLERANCE) {
  return (
    Math.abs(a.width - b.width) <= a.width * tol &&
    Math.abs(a.height - b.height) <= a.height * tol
  );
}

function iou(a: SlotRect, b: SlotRect) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.width * a.height + b.width * b.height - inter);
}

function findCandidates(src: any): SlotRect[] {
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

  const inside = rects.filter(
    (r) =>
      r.x > 1 &&
      r.y > 1 &&
      r.x + r.width < src.cols - 1 &&
      r.y + r.height < src.rows - 1
  );
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

function pickGridSize(rects: SlotRect[]) {
  let best: SlotRect | null = null;
  let bestScore = 0;
  for (const r of rects) {
    const count = rects.filter((o) => sameSize(r, o)).length;
    const score = count * 1e6 + r.width * r.height;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function dedupe(rects: SlotRect[]) {
  const sorted = [...rects].sort(
    (a, b) => b.width * b.height - a.width * a.height
  );
  const out: SlotRect[] = [];
  for (const r of sorted) {
    if (!out.some((o) => iou(o, r) > 0.4)) out.push(r);
  }
  return out;
}

function sortRowMajor(rects: SlotRect[]) {
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  const rows: SlotRect[][] = [];
  for (const r of sorted) {
    const row = rows.find((rw) => Math.abs(rw[0].y - r.y) < r.height / 2);
    if (row) row.push(r);
    else rows.push([r]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x));
}

export function detectSlots(src: any): SlotRect[] {
  const candidates = findCandidates(src);
  if (candidates.length === 0) return [];

  const ref = pickGridSize(candidates);
  if (!ref) return [];
  const grid = candidates.filter((r) => sameSize(ref, r, 0.2));
  const unique = dedupe(grid);

  const median = (arr: number[]) =>
    [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  const w = median(unique.map((r) => r.width));
  const h = median(unique.map((r) => r.height));
  const normalised = unique.map((r) => {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const x = Math.max(0, Math.round(cx - w / 2));
    const y = Math.max(0, Math.round(cy - h / 2));
    return {
      x,
      y,
      width: Math.min(w, src.cols - x),
      height: Math.min(h, src.rows - y),
    };
  });

  return sortRowMajor(normalised);
}

export function isBlueprintTile(mat: any) {
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
  return n > 0 && sat / n >= 0.62;
}
