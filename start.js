#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Name FOLDERS
const BACKEND_DIR = "medical_backend";
const FRONTEND_DIR = "medical_frontend";

const ROOT = __dirname;

// COLORS FOR LOG
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

function exists(p) {
  return fs.existsSync(p);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Runs a command and waits for it to finish
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    console.log(cyan(`> ${cmd} ${args.join(" ")}`));
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true, // Essential on Windows
      ...opts,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

(async function main() {
  console.log(green("=== 🚀 MEDICAL APP MICROSERVICES LAUNCHER ==="));

  // CHECK FOLDERS
  const backendPath = path.join(ROOT, BACKEND_DIR);
  const frontendPath = path.join(ROOT, FRONTEND_DIR);

  if (!exists(backendPath)) {
    console.error(red(`[ERROR] Folder '${BACKEND_DIR}' not found!`));
    process.exit(1);
  }

  // START DOCKER (Backend)
  console.log(yellow("\n--- 🐳 1. START BACKEND (DOCKER) ---"));
  console.log("Building and starting containers...");

  // Remove orphans and rebuild to ensure updated code
  try {
    await run("docker-compose", ["up", "-d", "--build", "--remove-orphans"], {
      cwd: backendPath,
    });
  } catch (e) {
    // Fallback for older versions of docker
    await run(
      "docker",
      ["compose", "up", "-d", "--build", "--remove-orphans"],
      { cwd: backendPath },
    );
  }

  console.log(green("✔ Docker started in background."));

  // 3. DATABASE SEEDING
  console.log(yellow("\n--- 🌱 2. DATABASE SEEDING ---"));
  console.log("Waiting 15 seconds for MySQL to be ready...");
  await sleep(15000); // MySQL takes a while to start the first time

  // The seed is inside services/data-service
  const seedPath = path.join(backendPath, "services", "data-service");

  if (exists(seedPath)) {
    // We need to install LOCAL dependencies to run the seed script on Windows
    if (!exists(path.join(seedPath, "node_modules"))) {
      console.log("Installing dependencies for seed script...");
      await run("npm", ["install"], { cwd: seedPath });
    }

    console.log("Running seed...");
    try {
      await run("node", ["seed.js"], { cwd: seedPath });
      console.log(green("✔ Database seeded successfully!"));
    } catch (e) {
      console.error(
        red(
          "⚠ Error during seed (maybe the DB was not ready yet), continuing anyway...",
        ),
      );
    }
  } else {
    console.warn(red("⚠ Folder data-service not found, skipping seed."));
  }

  // START FRONTEND
  console.log(yellow("\n--- 🖥️  3. START FRONTEND (QUASAR) ---"));
  if (!exists(frontendPath)) {
    console.error(red("[ERROR] Frontend folder not found."));
  } else {
    if (!exists(path.join(frontendPath, "node_modules"))) {
      console.log("Installing frontend dependencies...");
      await run("npm", ["install"], { cwd: frontendPath });
    }

    console.log(
      green(
        "✔ Starting application... PRESS CTRL+C TO EXIT AND SHUT DOWN EVERYTHING.",
      ),
    );
    console.log(
      cyan("-------------------------------------------------------"),
    );

    await run("npx", ["quasar", "dev"], { cwd: frontendPath });
  }
})()
  .catch(async (err) => {
    console.error(red(`\n[FATAL ERROR] ${err.message}`));
    process.exit(1);
  })
  .finally(async () => {
    console.log(yellow("\n\n🛑 SHUTTING DOWN SYSTEM..."));
    const backendPath = path.join(ROOT, BACKEND_DIR);
    try {
      await run("docker-compose", ["stop"], { cwd: backendPath });
      console.log(green("✔ Docker containers stopped."));
    } catch (e) {
      console.log(red("Error stopping Docker (please do it manually)."));
    }
  });
