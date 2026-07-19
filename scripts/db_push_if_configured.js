/**
 * On Vercel/production builds, sync Prisma schema when DATABASE_URL is present.
 * Skips quietly in CI/demo builds without a database.
 */
const { spawnSync } = require("child_process");

if (!process.env.DATABASE_URL?.trim()) {
  console.log("[db_push] DATABASE_URL not set — skipping prisma db push");
  process.exit(0);
}

console.log("[db_push] DATABASE_URL present — syncing schema");
const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
