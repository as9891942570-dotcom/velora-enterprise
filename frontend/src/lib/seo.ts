import type { Metadata } from "next";

import { BUSINESS_NAME, DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/config";

const defaultDescription =
  "Premium home decor products — flower pots, lotus aasan, decorative keychains, and handcrafted pieces for modern living.";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS_NAME} | Premium Home Decor`,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: BUSINESS_NAME,
    title: `${BUSINESS_NAME} | Premium Home Decor`,
    description: defaultDescription,
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: BUSINESS_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS_NAME} | Premium Home Decor`,
    description: defaultDescription,
    images: [DEFAULT_OG_IMAGE],
  },
};

export function pageMetadata(title: string, description: string, path = ""): Metadata {
  const url = path ? `${SITE_URL}${path}` : SITE_URL;
  return {
    title,
    description,
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}
