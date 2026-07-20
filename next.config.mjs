/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["googleapis", "openai"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
