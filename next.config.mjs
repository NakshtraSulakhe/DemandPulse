const DEFAULT_DB_NAME = "u449458970_demandpulse";

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return undefined;
  let url = rawUrl.trim();
  if (!url) return undefined;

  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  if (isVercel && (url.includes("localhost") || url.includes("127.0.0.1"))) {
    return undefined;
  }

  url = url.replace(/(:[0-9]+)\/:(?:[0-9]+)(\/|$|\?)/, "$1$2");
  url = url.replace(/([^/:]+)\/:([0-9]+)\//, "$1:$2/");
  url = url.replace(/([^/:]+)\/:([0-9]+)(\?|$)/, "$1:$2$3");

  try {
    const parsed = new URL(url);
    let dbName = parsed.pathname.replace(/^\/+/, "");
    if (!dbName || dbName === "3306" || dbName === ":3306") {
      const configuredName = process.env.DB_NAME?.replace(/^[:/]+/, "");
      dbName = (configuredName && configuredName !== "3306" && configuredName !== ":3306")
        ? configuredName
        : DEFAULT_DB_NAME;
    }
    parsed.pathname = `/${dbName}`;

    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "10");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "15");
    }
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
    const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
    if (isVercel && (host.includes("localhost") || host.includes("127.0.0.1"))) {
      return undefined;
    }
    const cleanHost = host.replace(/:[0-9]+$/, "").trim();
    const cleanPort = (host.includes(":") ? host.split(":")[1] : port).replace(/[^0-9]/g, "") || "3306";
    let cleanDb = database ? database.replace(/^[:/]+/, "").trim() : "";
    if (!cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
      cleanDb = DEFAULT_DB_NAME;
    }
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
  }
  return undefined;
}

function setupDatabaseEnv() {
  // 1. PRIORITY 1: Discrete DB credentials
  const fromCredentials = buildUrlFromDbCredentials();
  if (fromCredentials) {
    process.env.SLIDES_DATABASE_URL = fromCredentials;
    return;
  }

  // 2. PRIORITY 2: Direct connection string fallback
  const directUrl = process.env.SLIDES_DATABASE_URL || process.env.DATABASE_URL;
  const sanitized = sanitizeDatabaseUrl(directUrl);
  if (sanitized) {
    process.env.SLIDES_DATABASE_URL = sanitized;
  }
}

setupDatabaseEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["echarts", "zrender"],
};

export default nextConfig;
