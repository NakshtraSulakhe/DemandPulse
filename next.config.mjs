function setupDatabaseEnv() {
  if (process.env.SLIDES_DATABASE_URL && process.env.SLIDES_DATABASE_URL.trim() !== "") {
    process.env.SLIDES_DATABASE_URL = process.env.SLIDES_DATABASE_URL.trim().replace(/\/(:[0-9]+)(\/|$)/, "$1$2");
    return;
  }
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || "3306";

  if (host && user && database) {
    const cleanHost = host.replace(/:[0-9]+$/, "");
    const cleanPort = host.includes(":") ? host.split(":")[1] : port;
    const cleanDb = database.replace(/^[:/]+/, "");
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    process.env.SLIDES_DATABASE_URL = `mysql://${encodedUser}:${encodedPassword}@${cleanHost}:${cleanPort}/${cleanDb}?connect_timeout=15&connection_limit=1&pool_timeout=10`;
  }
}

setupDatabaseEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["echarts", "zrender"],
};

export default nextConfig;
