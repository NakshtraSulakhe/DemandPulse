// scripts/db-credentials.js
try {
  require("dotenv").config();
} catch {}

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
    process.env.DB_HOSTNAME ||
    ""
  );

  let rawPort = cleanEnvVal(
    process.env.DB_PORT ||
    process.env.MYSQL_PORT ||
    process.env.DATABASE_PORT ||
    ""
  );

  let cleanHost = rawHost;
  let cleanPort = rawPort || "3306";
  if (cleanHost.includes(":")) {
    const parts = cleanHost.split(":");
    cleanHost = parts[0];
    cleanPort = parts[1].replace(/[^0-9]/g, "") || cleanPort;
  }
  cleanPort = cleanPort.replace(/[^0-9]/g, "") || "3306";

  const user = cleanEnvVal(
    process.env.DB_USER ||
    process.env.MYSQL_USER ||
    process.env.DATABASE_USER ||
    process.env.DB_USERNAME ||
    ""
  );

  const password = cleanEnvVal(
    process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD :
    process.env.MYSQL_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    process.env.DB_PASS ||
    "",
    true
  );

  let rawDb = cleanEnvVal(
    process.env.DB_NAME ||
    process.env.MYSQL_DATABASE ||
    process.env.DATABASE_NAME ||
    process.env.DB_DATABASE ||
    ""
  );
  let cleanDb = rawDb.replace(/^[:/]+/, "").trim();

  // If credentials are not present, check SLIDES_DATABASE_URL or DATABASE_URL before returning placeholder
  if (!cleanHost || !user || !cleanDb || cleanDb === "3306" || cleanDb === ":3306") {
    if (process.env.SLIDES_DATABASE_URL && !process.env.SLIDES_DATABASE_URL.includes("unconfigured_user")) {
      return process.env.SLIDES_DATABASE_URL;
    }
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("unconfigured_user")) {
      return process.env.DATABASE_URL;
    }
    return "mysql://unconfigured_user:unconfigured_pass@127.0.0.1:3306/u449458970_demandpulse?connect_timeout=15";
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
}

module.exports = {
  cleanEnvVal,
  buildUrlFromDbCredentials,
};
