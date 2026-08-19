// The server almost always runs in UTC. Iraq is UTC+3 all year (no daylight
// saving), so without this every check-in time, visit time and "today" would be
// three hours early. Set before Next boots so all Date calls agree.
process.env.TZ = process.env.TZ || "Asia/Baghdad";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
