import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Privacy Policy",
  "How Velora Enterprise collects, uses, and protects your personal information.",
  "/privacy",
);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
