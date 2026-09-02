/**
 * Centralized frontend configuration.
 * All API calls should use API_BASE_URL from this module.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const BUSINESS_NAME =
  process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Velora Enterprise";

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@veloraenterprise.com";

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const RAZORPAY_KEY_ID =
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

export const SHIPPING_FLAT_RATE = Number(
  process.env.NEXT_PUBLIC_SHIPPING_FLAT_RATE ?? "99",
);

export const FREE_SHIPPING_MIN_ORDER = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_MIN_ORDER ?? "999",
);

export const WHATSAPP_PREFILL_MESSAGE =
  "Hello Velora Enterprise, I have a question about your products.";

export function getWhatsAppUrl(message?: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  const text = encodeURIComponent(message ?? WHATSAPP_PREFILL_MESSAGE);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
