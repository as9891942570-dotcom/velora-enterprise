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
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "veloraenterprise2@gmail.com";

export const SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+91 9310189802";

export const SUPPORT_PHONE_TEL =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE_TEL ?? "+919310189802";

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919310189802";

export const COMPANY_CITY =
  process.env.NEXT_PUBLIC_COMPANY_CITY ?? "Ghaziabad";

export const WORKING_HOURS =
  process.env.NEXT_PUBLIC_WORKING_HOURS ?? "Mon–Sat, 9:00 AM – 7:00 PM";

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

export const WHATSAPP_ORDER_HELP_MESSAGE =
  "Hello Velora Enterprise, I need help with my order.";

export function getWhatsAppUrl(message?: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  const text = encodeURIComponent(message ?? WHATSAPP_PREFILL_MESSAGE);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export function getOrderHelpWhatsAppUrl(orderNumber?: string): string | null {
  const message = orderNumber
    ? `Hello Velora Enterprise, I need help regarding Order #${orderNumber}.`
    : WHATSAPP_ORDER_HELP_MESSAGE;
  return getWhatsAppUrl(message);
}

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
