import type { MetadataRoute } from "next";

import { serverFetch } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import type { PaginatedResponse, ProductListItem } from "@/lib/types";

const staticRoutes = [
  "",
  "/shop",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/shipping-policy",
  "/returns",
  "/privacy",
  "/terms",
  "/shipping",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/shop" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.6,
  }));

  try {
    const products = await serverFetch<PaginatedResponse<ProductListItem>>(
      "/products?page_size=100",
      { revalidate: 3600 },
    );
    for (const product of products.items) {
      if (product.is_active) {
        entries.push({
          url: `${SITE_URL}/product/${product.slug}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // sitemap still returns static routes if API unavailable at build time
  }

  return entries;
}
