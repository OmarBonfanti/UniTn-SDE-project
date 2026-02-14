const { execSync } = require("child_process");

console.log("=== 🔄 MEDICAL APP QUICK RESTART (Preserving Data) ===");

try {
  // 1. Restarting Backend containers without removing volumes
  console.log("\n--- 🐳 1. RESTARTING BACKEND (DOCKER) ---");
  console.log("Stopping and restarting existing containers...");

  execSync("docker compose -f medical_backend/docker-compose.yml restart", {
    stdio: "inherit",
  });

  // 2. Starting Frontend
  console.log("\n--- 🖥️  2. STARTING FRONTEND (QUASAR) ---");
  console.log("Launching application... PRESS CTRL+C TO STOP ALL.");

  execSync("cd medical_frontend && npm run dev", { stdio: "inherit" });
} catch (error) {
  console.error("\n❌ [FATAL ERROR] Restart failed:");
  console.error(error.message);
  process.exit(1);
}
