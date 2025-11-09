#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

if (process.env.ARELA_SKIP_POSTINSTALL === "1") {
  console.log("[Arela] Skipping postinstall (ARELA_SKIP_POSTINSTALL=1).");
  process.exit(0);
}

const packageDir = __dirname;
const distCli = path.join(packageDir, "dist", "cli.js");
if (!fs.existsSync(distCli)) {
  // Happens in workspace dev before build; nothing to do.
  process.exit(0);
}

const initCwd = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : null;
if (!initCwd) {
  process.exit(0);
}
const arelaDir = path.join(initCwd, ".arela");
if (fs.existsSync(arelaDir)) {
  process.exit(0);
}

const result = spawnSync("node", [distCli, "init"], {
  cwd: packageDir,
  stdio: "inherit",
  env: process.env,
});

if (result.status && result.status !== 0) {
  process.exit(result.status);
}
process.exit(0);
