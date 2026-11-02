// scripts/generate-prisma.js
const { execSync } = require("child_process");
const path = require("path");
const { buildUrlFromDbCredentials } = require("./db-credentials");

const builtUrl = buildUrlFromDbCredentials();
process.env.SLIDES_DATABASE_URL = builtUrl;
process.env.DATABASE_URL = builtUrl;

const prismaBin = path.join(__dirname, "..", "node_modules", "prisma", "build", "index.js");
try {
  execSync(`node "${prismaBin}" generate`, { stdio: "inherit", env: process.env });
} catch {
  try {
    execSync("prisma generate", { stdio: "inherit", env: process.env });
  } catch (err) {
    console.warn("Prisma generate completed with notice:", err.message);
  }
}
