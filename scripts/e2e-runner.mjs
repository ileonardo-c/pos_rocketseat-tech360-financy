import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

  return next;
};

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error("Usage: node scripts/e2e-runner.mjs <frontend-script-and-args>");
  process.exit(1);
}

const script = command[0];
const forwardedArgs = command.slice(1);
const hasExternalGrep =
  forwardedArgs.includes("--grep") || forwardedArgs.some((arg) => arg.startsWith("--grep="));

if (script === "test:e2e:contract" && hasExternalGrep) {
  console.error(
    "e2e:contract already defines its own filter. Remove external --grep and use one filter source only.",
  );
  process.exit(1);
}

const env = buildEnv();
const result = spawnSync("pnpm", ["--filter", "@financy/frontend", ...command], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`[e2e-runner] Unable to start command: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);
