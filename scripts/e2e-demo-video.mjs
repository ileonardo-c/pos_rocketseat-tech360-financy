import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cross-platform demo video runner.
// Sets E2E_DEMO_VIDEO=true and delegates to the e2e-runner for the demo-video script.

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf-8");
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) {
      continue;
    }

    const index = raw.indexOf("=");
    if (index < 0) {
      continue;
    }

    const key = raw.slice(0, index).trim();
    const value = raw.slice(index + 1).trim();
    if (!key) {
      continue;
    }

    values[key] = value;
  }

  return values;
};

const mergeEnvFiles = (...files) => {
  const merged = {};
  for (const file of files) {
    Object.assign(merged, parseEnvFile(file));
  }
  return merged;
};

const buildEnv = () => {
  const examplePath = resolve(process.cwd(), ".env.example");
  const basePath = resolve(process.cwd(), ".env");

  const fromFiles = mergeEnvFiles(examplePath, basePath);
  const next = { ...process.env };

  for (const [key, value] of Object.entries(fromFiles)) {
    if (next[key] === undefined || next[key] === "") {
      next[key] = value;
    }
  }

  // Force demo video mode
  next.E2E_DEMO_VIDEO = "true";

  return next;
};

const env = buildEnv();

const result = spawnSync("pnpm", ["--filter", "@financy/frontend", "test:e2e:demo-video"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`[e2e-demo-video] Unable to start command: ${result.error.message}`);
  process.exit(1);
}

// Post-processing: delete .zip traces and rename video with timestamp
if (result.status === 0) {
  const postprocess = resolve(process.cwd(), "scripts", "e2e-demo-video-postprocess.mjs");
  const pp = spawnSync("node", [postprocess], {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: process.platform === "win32",
  });
  if (pp.error) {
    console.error(`[e2e-demo-video] Post-processing failed: ${pp.error.message}`);
  }
}

process.exit(result.status ?? 0);
