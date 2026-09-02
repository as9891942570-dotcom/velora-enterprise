import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Terms & Conditions",
  "Terms of use for shopping at Velora Enterprise.",
  "/terms",
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
