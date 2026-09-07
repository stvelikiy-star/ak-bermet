/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["googleapis", "openai"],
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg", permanent: true },
      { source: "/favicon.png", destination: "/icon.svg", permanent: true },
    ];
  },
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
