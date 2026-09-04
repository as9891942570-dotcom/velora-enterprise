import type { NextConfig } from "next";

function apiRemotePattern():
  | { protocol: "http" | "https"; hostname: string; port?: string }
  | null {
  try {
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const origin = base.replace(/\/api\/v1\/?$/, "");
    const url = new URL(origin);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    if (protocol !== "http" && protocol !== "https") return null;
    return {
      protocol,
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return null;
  }
}

const apiPattern = apiRemotePattern();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(apiPattern ? [apiPattern] : []),
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
