/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@b2b/ui", "@b2b/auth", "@b2b/api-client"],
  reactStrictMode: true,
};

module.exports = nextConfig;
