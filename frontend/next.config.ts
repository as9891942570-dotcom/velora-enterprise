import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "velora-enterprise.onrender.com",
      },

      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },

      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },

      {
        protocol: "http",
        hostname: "localhost",
      },

      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },

      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],

    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;