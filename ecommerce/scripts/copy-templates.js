const fs = require("fs");
const path = require("path");

// Function to copy directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all files/folders in source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("Copying templates to build output...");

const templatesSource = path.join(__dirname, "..", "public", "templates");
const templatesDest = path.join(
  __dirname,
  "..",
  ".next",
  "server",
  "public",
  "templates"
);

try {
  if (fs.existsSync(templatesSource)) {
    copyDir(templatesSource, templatesDest);
    console.log(
      `✓ Templates copied from ${templatesSource} to ${templatesDest}`
    );

    // Verify files were copied
    const copiedFiles = fs.readdirSync(templatesDest);
    console.log(`✓ ${copiedFiles.length} template files copied successfully`);
  } else {
    console.error(`✗ Templates source directory not found: ${templatesSource}`);
    process.exit(1);
  }
} catch (error) {
  console.error("✗ Error copying templates:", error);
  process.exit(1);
}
