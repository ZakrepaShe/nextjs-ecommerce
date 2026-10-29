"use server";

import { revalidatePath } from "next/cache";
import { updateUserBlueprintFound } from "./arc-blueprints-actions";
import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";
import { detectSlots, isBlueprintTile } from "./slots";

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

const SLOT_SIZE = 128;
const MATCH_THRESHOLD = 0.8;

// Get templates directory path
function getTemplatesDir() {
  const cwd = process.cwd();

  const candidates = [
    // Standard location (works in dev and production via outputFileTracingIncludes)
    path.join(cwd, "public", "templates"),
    // Fallback locations
    path.join(cwd, "..", "public", "templates"),
    path.join(cwd, "ecommerce", "public", "templates"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
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

// Extract center region (blueprint content only, excluding borders)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCenterRegion(mat: any) {
  // Extract center 60% of the image (excludes border)
  const width = mat.cols;
  const height = mat.rows;
  const cropWidth = Math.floor(width * 0.6);
  const cropHeight = Math.floor(height * 0.6);
  const x = Math.floor((width - cropWidth) / 2);
  const y = Math.floor((height - cropHeight) / 2);

  const roi = mat.roi(new cv.Rect(x, y, cropWidth, cropHeight));
  const center = roi.clone();
  roi.delete();

  return center;
}

// Preprocess image for better matching
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function preprocessImage(grayMat: any) {
  // Just extract center region to focus on blueprint content
  const center = extractCenterRegion(grayMat);
  return center;
}

// Load templates
async function loadTemplates() {
  const templates = [];
  const templatesDir = getTemplatesDir();

  if (!templatesDir) {
    throw new Error(`Templates directory not found (cwd: ${process.cwd()})`);
  }

  const dirs = [
    templatesDir,
    path.join(templatesDir, "designs"),
    path.join(templatesDir, "stencils"),
  ];
  const files = dirs.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".png"))
      .map((file) => path.join(dir, file));
  });

  for (const file of files) {
    const img = await loadImage(file);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const mat = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    mat.delete();

    // Apply preprocessing to template
    const processed = preprocessImage(gray);
    gray.delete();

    templates.push({
      name: path.basename(file, ".png"),
      mat: processed,
    });
  }

  return templates;
}

// Match slot against templates using template matching only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchSlot(slotMat: any, templates: any[]) {
  const slotGray = new cv.Mat();
  cv.cvtColor(slotMat, slotGray, cv.COLOR_RGBA2GRAY);

  // Apply same preprocessing to slot as templates
  const slotProcessed = preprocessImage(slotGray);
  slotGray.delete();

  let best = {
    name: null as string | null,
    confidence: 0,
  };

  // FOR DEBUGGING ONLY
  // const allResults: { name: string | null; confidence: number }[] = [];

  for (const tpl of templates) {
    // Template matching only (100% weight)
    const result = new cv.Mat();
    cv.matchTemplate(slotProcessed, tpl.mat, result, cv.TM_CCOEFF_NORMED);
    const mm = cv.minMaxLoc(result);
    result.delete();

    const score = mm.maxVal;

    // FOR DEBUGGING ONLY
    // allResults.push({
    //   name: tpl.name,
    //   confidence: score,
    // });

    if (score > best.confidence) {
      best = {
        name: tpl.name,
        confidence: score,
      };
    }
  }

  // Cleanup
  slotProcessed.delete();

  // FOR DEBUGGING ONLY
  // console.table(allResults);

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
    const accepted =
      match.confidence >= MATCH_THRESHOLD &&
      (match.name?.endsWith("-design") ||
        match.name?.endsWith("-stencil") ||
        match.confidence >= 0.9 ||
        isBlueprintTile(resized));

    if (accepted) {
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
    templates.forEach((t) => {
      t.mat.delete();
    });

    // FOR DEBUGGING ONLY
    // console.table(matches);

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
