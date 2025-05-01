import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://server:5000/api/:path*", // 👈 talks to the backend Docker container
      },
    ];
  },
};

export default nextConfig;
