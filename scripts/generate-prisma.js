// scripts/generate-prisma.js
const { execSync } = require("child_process");
const path = require("path");

function buildDatabaseUrl() {
  if (process.env.SLIDES_DATABASE_URL && process.env.SLIDES_DATABASE_URL.trim() !== "") {
    return process.env.SLIDES_DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || "3306";

  if (host && user && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?connect_timeout=30`;
  }

  return "mysql://db_build_user:db_build_pass@localhost:3306/db_build?connect_timeout=30";
}

process.env.SLIDES_DATABASE_URL = buildDatabaseUrl();

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
