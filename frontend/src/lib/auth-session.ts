/** Customer vs admin authentication scopes (separate cookies + access tokens). */
export type AuthScope = "customer" | "admin";

export const CUSTOMER_REFRESH_COOKIE = "refresh_token";
export const ADMIN_REFRESH_COOKIE = "admin_refresh_token";

/**
 * Best-effort hint only. Refresh tokens are HttpOnly and are NOT visible in document.cookie.
 * Do not use this to skip refresh requests — always POST to the refresh endpoint with credentials.
 */
export function hasRefreshCookie(scope: AuthScope): boolean {
  if (typeof document === "undefined") return false;
  const name = scope === "admin" ? ADMIN_REFRESH_COOKIE : CUSTOMER_REFRESH_COOKIE;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${name}=`));
}

/** Clear legacy in-memory keys from older builds (safe no-op if absent). */
export function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("velora_auth");
    localStorage.removeItem("velora_admin_auth");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("admin_access_token");
  } catch {
    // ignore
  }
}
