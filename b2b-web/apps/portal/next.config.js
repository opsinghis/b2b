/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@b2b/ui", "@b2b/auth", "@b2b/api-client"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dev-uk.pandora.net",
        pathname: "/dw/image/**",
      },
      {
        protocol: "https",
        hostname: "*.pandora.net",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
  },
};

module.exports = nextConfig;
