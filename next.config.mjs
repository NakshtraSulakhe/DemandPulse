const DEFAULT_DB_NAME = "u449458970_demandpulse";
const DEFAULT_HOST = "auth-db1274.hstgr.io";
const DEFAULT_USER = "u449458970_demandpulse";
const DEFAULT_PASS = "TaRajGlobal@2026#";
const DEFAULT_PORT = "3306";

function cleanEnvVal(raw, isSecret = false) {
  if (raw === undefined || raw === null) return "";
  let val = String(raw).trim();
  if (!val) return "";

  const quoteMatch = val.match(/^(['"])(.*)\1(?:\s*(?:#|\/\/).*)?$/);
  if (quoteMatch) {
    return quoteMatch[2].trim();
  }

  if (!isSecret) {
    val = val.replace(/\s+(?:#|\/\/).*$/, "").trim();
  }

  val = val.replace(/^["']+|["']+$/g, "").trim();
  return val;
}

function buildUrlFromDbCredentials() {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);

  let rawHost = cleanEnvVal(
    process.env.DB_HOST ||
    process.env.MYSQL_HOST ||
    process.env.DATABASE_HOST ||
    process.env.DBHOST ||
    process.env.DB_HOSTNAME ||
    ""
  );

  if (isVercel && (rawHost === "localhost" || rawHost === "127.0.0.1")) {
    rawHost = "";
  }
  let host = rawHost || DEFAULT_HOST;

  let rawPort = cleanEnvVal(
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    process.env.DATABASE_PORT ||
    process.env.PORT ||
    ""
  );

  let cleanHost = host;
  let cleanPort = rawPort || DEFAULT_PORT;
  if (cleanHost.includes(":")) {
    const parts = cleanHost.split(":");
    cleanHost = parts[0];
    cleanPort = parts[1].replace(/[^0-9]/g, "") || cleanPort;
  }
  cleanPort = cleanPort.replace(/[^0-9]/g, "") || DEFAULT_PORT;

  const user = cleanEnvVal(
    process.env.DB_USER ||
    process.env.MYSQL_USER ||
    process.env.DATABASE_USER ||
    process.env.DB_USERNAME ||
    process.env.MYSQLUSER ||
    ""
  ) || DEFAULT_USER;

  const password = cleanEnvVal(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    process.env.DB_PASS ||
    process.env.MYSQLPASSWORD ||
    process.env.DBPASS ||
    "",
    true
  ) || DEFAULT_PASS;

  let rawDb = cleanEnvVal(
    process.env.DB_NAME ||
    process.env.MYSQL_DATABASE ||
    process.env.DATABASE_NAME ||
    process.env.DB_DATABASE ||
    process.env.MYSQLDATABASE ||
    process.env.DBNAME ||
    ""
  );
  let cleanDb = rawDb.replace(/^[:/]+/, "").trim();
  if (!cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
    cleanDb = DEFAULT_DB_NAME;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
}

function setupDatabaseEnv() {
  const builtUrl = buildUrlFromDbCredentials();
  process.env.SLIDES_DATABASE_URL = builtUrl;
  process.env.DATABASE_URL = builtUrl;
}

setupDatabaseEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["echarts", "zrender"],
};

export default nextConfig;
