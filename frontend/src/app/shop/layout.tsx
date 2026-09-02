import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Shop",
  "Browse premium home decor — flower pots, lotus aasan, keychains, and handcrafted pieces.",
  "/shop",
);

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
