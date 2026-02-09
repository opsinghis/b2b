/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@b2b/ui"],
  reactStrictMode: true,
};

module.exports = nextConfig;
