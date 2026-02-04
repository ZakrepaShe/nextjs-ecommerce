"use server";

import { revalidatePath } from "next/cache";
import { updateUserBlueprintFound } from "./arc-blueprints-actions";
import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const cv = require("@techstark/opencv-js");

// Flag to track OpenCV initialization
let isOpenCVReady = false;
let openCVInitPromise: Promise<void> | null = null;

// Initialize OpenCV
function initOpenCV(): Promise<void> {
  if (isOpenCVReady) {
    return Promise.resolve();
  }

  if (openCVInitPromise) {
    return openCVInitPromise;
  }

  openCVInitPromise = new Promise((resolve, reject) => {
    if (cv.Mat) {
      isOpenCVReady = true;
      resolve();
      return;
    }

    if (cv.onRuntimeInitialized) {
      cv.onRuntimeInitialized = () => {
        isOpenCVReady = true;
        resolve();
      };
    } else {
      // Wait for OpenCV to be ready
      const checkInterval = setInterval(() => {
        if (cv.Mat) {
          clearInterval(checkInterval);
          isOpenCVReady = true;
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("OpenCV initialization timeout"));
      }, 10000);
    }
  });

  return openCVInitPromise;
}

export interface BlueprintMatch {
  slot: number;
  blueprint: string | null;
  confidence: number;
}

export interface RecognitionResult {
  success: boolean;
  message: string;
  matches?: BlueprintMatch[];
  slotsDetected?: number;
}

// Configuration constants
const MIN_AREA = 2500;
const MAX_AREA = 25000;
const MIN_ASPECT = 0.8;
const MAX_ASPECT = 1.2;
const POSITION_EPS = 6;
const SLOT_SIZE = 64;
const MATCH_THRESHOLD = 0.75;

// Get templates directory path
function getTemplatesDir() {
  // In production/serverless environments, __dirname points to the .next/server directory
  // We need to look for templates in multiple possible locations
  const candidates = [
    // Standard Next.js dev/prod location
    path.join(process.cwd(), "public", "templates"),
    // If CWD is the app directory
    path.join(process.cwd(), "..", "public", "templates"),
    // If CWD is the root project directory
    path.join(process.cwd(), "ecommerce", "public", "templates"),
    // Vercel serverless function location - relative to .next directory
    path.join(process.cwd(), ".next", "static", "templates"),
    // Alternative Vercel location
    path.join(process.cwd(), "../../public", "templates"),
  ];

  // Log for debugging in production
  console.log("Looking for templates directory, cwd:", process.cwd());

  for (const dir of candidates) {
    console.log("Checking:", dir, "exists:", fs.existsSync(dir));
    if (fs.existsSync(dir)) {
      console.log("Found templates at:", dir);
      return dir;
    }
  }

  // List what's actually in the current directory for debugging
  try {
    console.log("Contents of cwd:", fs.readdirSync(process.cwd()));
    if (fs.existsSync(path.join(process.cwd(), "public"))) {
      console.log(
        "Contents of public:",
        fs.readdirSync(path.join(process.cwd(), "public"))
      );
    }
  } catch (e) {
    console.error("Error listing directories:", e);
  }

  return null;
}

// Load image to OpenCV Mat
async function loadImageToMat(buffer: Buffer) {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const mat = cv.matFromImageData(imageData);
  return mat;
}

// Load templates
async function loadTemplates() {
  const templates = [];
  const templatesDir = getTemplatesDir();

  if (!templatesDir) {
    throw new Error(`Templates directory not found (cwd: ${process.cwd()})`);
  }

  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith(".png"));

  for (const file of files) {
    const img = await loadImage(path.join(templatesDir, file));
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
      mat: gray,
    });
  }

  return templates;
}

// Deduplicate and sort rectangles
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dedupeAndSort(rects: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];

  rects.forEach((r) => {
    const exists = out.some(
      (e) =>
        Math.abs(e.x - r.x) < POSITION_EPS && Math.abs(e.y - r.y) < POSITION_EPS
    );
    if (!exists) out.push(r);
  });

  return out.sort((a, b) => {
    const dy = a.y - b.y;
    return Math.abs(dy) > 10 ? dy : a.x - b.x;
  });
}

// Detect slots in image
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectSlots(src: any) {
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

// Match slot against templates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchSlot(slotMat: any, templates: any[]) {
  const slotGray = new cv.Mat();
  cv.cvtColor(slotMat, slotGray, cv.COLOR_RGBA2GRAY);

  let best = {
    name: null as string | null,
    confidence: 0,
  };

  for (const tpl of templates) {
    const result = new cv.Mat();

    cv.matchTemplate(slotGray, tpl.mat, result, cv.TM_CCOEFF_NORMED);

    const mm = cv.minMaxLoc(result);

    if (mm.maxVal > best.confidence) {
      best = {
        name: tpl.name,
        confidence: mm.maxVal,
      };
    }

    result.delete();
  }

  slotGray.delete();

  return best;
}

// Match all slots
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchAllSlots(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  src: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rects: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[]
): BlueprintMatch[] {
  const results: BlueprintMatch[] = [];

  rects.forEach((r, i) => {
    const roi = src.roi(new cv.Rect(r.x, r.y, r.width, r.height));

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
        confidence: Number(match.confidence.toFixed(3)),
      });
    } else {
      results.push({
        slot: i,
        blueprint: null,
        confidence: Number(match.confidence.toFixed(3)),
      });
    }

    roi.delete();
    resized.delete();
  });

  return results;
}

// Main recognition function
export async function recognizeBlueprintsFromImage(
  userId: string,
  formData: FormData
): Promise<RecognitionResult> {
  try {
    // Initialize OpenCV first
    await initOpenCV();

    const file = formData.get("image") as File;

    if (!file) {
      return {
        success: false,
        message: "No image file provided",
      };
    }

    if (!userId) {
      return {
        success: false,
        message: "User ID is required",
      };
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Load image to Mat
    const mat = await loadImageToMat(buffer);

    // Detect slots
    const rects = detectSlots(mat);

    if (rects.length === 0) {
      mat.delete();
      return {
        success: false,
        message: "No blueprint slots detected in image",
        slotsDetected: 0,
      };
    }

    // Load templates
    const templates = await loadTemplates();

    // Match all slots
    const matches = matchAllSlots(mat, rects, templates);

    // Cleanup
    mat.delete();
    templates.forEach((t) => t.mat.delete());

    // Update user blueprints
    const foundBlueprints = matches.filter(
      (match) => match.blueprint && match.confidence >= MATCH_THRESHOLD
    );

    let updatedCount = 0;
    for (const match of foundBlueprints) {
      if (match.blueprint) {
        await updateUserBlueprintFound(userId, match.blueprint, true);
        updatedCount++;
      }
    }

    // Revalidate the blueprints page
    revalidatePath("/arc-raiders/blueprints");

    return {
      success: true,
      message: `Found ${updatedCount} blueprint(s) from ${rects.length} detected slot(s)`,
      matches: foundBlueprints,
      slotsDetected: rects.length,
    };
  } catch (error) {
    console.error("Error in recognizeBlueprintsFromImage:", error);
    return {
      success: false,
      message: `Failed to process image: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
