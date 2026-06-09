import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "development compose",
    args: [
      "compose",
      "--env-file",
      ".env.example",
      "-p",
      "financy-dev",
      "-f",
      "docker-compose.yml",
      "config",
    ],
  },
  {
    name: "CI compose",
    args: [
      "compose",
      "--env-file",
      ".env.example",
      "-p",
      "financy-ci",
      "-f",
      "docker-compose.yml",
      "config",
    ],
  },
];

for (const check of checks) {
  console.log(`[compose-check] Validating ${check.name}`);
  const result = spawnSync("docker", check.args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
