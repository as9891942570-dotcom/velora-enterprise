import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "About Us",
  "Learn about Velora Enterprise — premium home decor crafted for modern Indian homes.",
  "/about",
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
