// scripts/generate-prisma.js
const { execSync } = require("child_process");
const path = require("path");

const DEFAULT_DB_NAME = "u449458970_demandpulse";

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return undefined;
  let url = rawUrl.trim();
  if (!url) return undefined;

  url = url.replace(/(:[0-9]+)\/:(?:[0-9]+)(\/|$|\?)/, "$1$2");
  url = url.replace(/([^/:]+)\/:([0-9]+)\//, "$1:$2/");
  url = url.replace(/([^/:]+)\/:([0-9]+)(\?|$)/, "$1:$2$3");

  try {
    const parsed = new URL(url);
    let dbName = parsed.pathname.replace(/^\/+/, "");
    if (!dbName || dbName === "3306" || dbName === ":3306") {
      dbName = DEFAULT_DB_NAME;
    }
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildUrlFromDbCredentials() {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD ?? "";
  let database = process.env.DB_NAME?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";

  if (host && user) {
    const cleanHost = host.replace(/:[0-9]+$/, "").trim();
    const cleanPort = (host.includes(":") ? host.split(":")[1] : port).replace(/[^0-9]/g, "") || "3306";
    let cleanDb = database ? database.replace(/^[:/]+/, "").trim() : "";
    if (!cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
      cleanDb = DEFAULT_DB_NAME;
    }
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=30`;
  }
  return undefined;
}

function buildDatabaseUrl() {
  // 1. PRIORITY 1: Discrete DB credentials
  const fromCredentials = buildUrlFromDbCredentials();
  if (fromCredentials) {
    return fromCredentials;
  }

  // 2. PRIORITY 2: Direct connection string fallback
  const directUrl = process.env.SLIDES_DATABASE_URL || process.env.DATABASE_URL;
  const sanitized = sanitizeDatabaseUrl(directUrl);
  if (sanitized) {
    return sanitized;
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
