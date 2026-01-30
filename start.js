#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const BACKEND_DIR = "medical_backend";
const FRONTEND_DIR = "medical_frontend";

const ROOT = __dirname;

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

function exists(p) {
  return fs.existsSync(p);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32", // aiuta su Windows per trovare cmd/quasar ecc.
      ...opts,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function start(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  return child;
}

async function dockerComposeUp(cwd) {
  // Prova prima "docker compose", poi fallback "docker-compose"
  try {
    await run("docker", ["compose", "up", "-d"], { cwd });
  } catch (e1) {
    await run("docker-compose", ["up", "-d"], { cwd });
  }
}

async function killProcessTree(proc) {
  if (!proc || proc.killed) return;

  // Windows: taskkill /T /F
  if (process.platform === "win32") {
    try {
      await run("taskkill", ["/PID", String(proc.pid), "/T", "/F"]);
      return;
    } catch {
      // fallback sotto
    }
  }

  // Unix: SIGTERM
  try {
    proc.kill("SIGTERM");
  } catch {}
}

(async function main() {
  console.log(green("=== MEDICAL APP LAUNCHER ==="));

  // -------- Backend --------
  const backendPath = path.join(ROOT, BACKEND_DIR);
  console.log(`📂 Looking for backend folder: ${BACKEND_DIR}...`);
  if (!exists(backendPath)) {
    console.error(red(`[ERROR] Folder '${BACKEND_DIR}' not found!`));
    process.exit(1);
  }

  const backendNodeModules = path.join(backendPath, "node_modules");
  if (!exists(backendNodeModules)) {
    console.log("📦 Missing dependencies. Running 'npm install'...");
    await run("npm", ["install"], { cwd: backendPath });
  }

  console.log("\n1/4 Starting Docker Compose...");
  const composeYml = path.join(backendPath, "docker-compose.yml");
  if (!exists(composeYml)) {
    console.error(
      red(`[ERROR] docker-compose.yml not found in ${BACKEND_DIR}`),
    );
    process.exit(1);
  }
  await dockerComposeUp(backendPath);

  console.log("⏳ Waiting for Database (10s)...");
  await sleep(10_000);

  console.log("\n2/4 Populating Database...");
  await run("node", [path.join("src", "seed.js")], { cwd: backendPath });

  console.log("\n3/4 Starting Server...");
  const backendProc = start("node", [path.join("src", "server.js")], {
    cwd: backendPath,
  });

  const cleanup = async () => {
    await killProcessTree(backendProc);
  };

  process.on("SIGINT", async () => {
    // Ctrl+C
    await cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });
  process.on("exit", () => {
    // best-effort (sync-ish)
    try {
      if (backendProc && !backendProc.killed) backendProc.kill();
    } catch {}
  });

  // -------- Frontend --------
  const frontendPath = path.join(ROOT, FRONTEND_DIR);
  console.log(`\n📂 Looking for frontend folder: ${FRONTEND_DIR}...`);
  if (!exists(frontendPath)) {
    console.error(red("[ERROR] Frontend folder not found!"));
    await cleanup();
    process.exit(1);
  }

  const frontendNodeModules = path.join(frontendPath, "node_modules");
  if (!exists(frontendNodeModules)) {
    console.log("📦 Missing frontend dependencies. Running 'npm install'...");
    await run("npm", ["install"], { cwd: frontendPath });
  }

  console.log("\n4/4 Starting Quasar...");
  try {
    await run("quasar", ["dev"], { cwd: frontendPath });
  } finally {
    await cleanup();
  }
})().catch(async (err) => {
  console.error(red(`\n[ERROR] ${err.message}`));
  process.exit(1);
});
