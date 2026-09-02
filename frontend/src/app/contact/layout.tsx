import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Contact Us",
  "Get in touch with Velora Enterprise for product inquiries, order support, and business questions.",
  "/contact",
);

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
