/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@b2b/ui", "@b2b/auth", "@b2b/api-client"],
  reactStrictMode: true,
};

module.exports = nextConfig;
