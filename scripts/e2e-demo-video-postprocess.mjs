import { existsSync, readdirSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

// Post-processing for demo video: delete .zip traces and rename video with timestamp.
// Designed to run inside the container (or host) after the Playwright test finishes.

const testResultsDir = resolve(process.cwd(), "frontend", "tests", "e2e", "results");

if (!existsSync(testResultsDir)) {
  console.log("[e2e-demo-video] No test-results directory found, skipping post-processing.");
  process.exit(0);
}

const walkDir = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const allFiles = walkDir(testResultsDir);

// Delete all .zip files (traces)
let deletedCount = 0;
for (const file of allFiles) {
  if (file.endsWith(".zip")) {
    unlinkSync(file);
    deletedCount++;
  }
}
if (deletedCount > 0) {
  console.log(`[e2e-demo-video] Deleted ${deletedCount} trace file(s).`);
}

// Rename video files with current timestamp
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

for (const file of allFiles) {
  if (file.endsWith(".webm")) {
    const dir = resolve(file, "..");
    const newName = join(dir, `financy-demo-${timestamp}.webm`);
    renameSync(file, newName);
    console.log(`[e2e-demo-video] Video: ${newName}`);
  }
}
