import { API_BASE_URL } from "@/lib/config";

/** Backend origin without /api/v1 suffix — used to resolve /uploads/... paths. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

const INVALID_PATTERNS = [
  /^file:\/\//i,
  /^[a-zA-Z]:\\/,
  /^\/[a-zA-Z]:\\/,
  /^blob:/i,
];

/** Returns false for file:// paths, Windows paths, blob URLs, etc. */
export function isDisplayableImageUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  return !INVALID_PATTERNS.some((pattern) => pattern.test(url.trim()));
}

/**
 * Resolve a product image URL for browser display.
 * - /uploads/... → http://localhost:8000/uploads/...
 * - https://... → used as-is
 * - file:// or local paths → null (show placeholder)
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!isDisplayableImageUrl(url)) return null;
  const value = url!.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }
  return `${API_ORIGIN}/${value}`;
}
