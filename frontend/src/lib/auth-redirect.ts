/** Returns a safe internal redirect path for post-login navigation. */
export function getSafeRedirect(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  if (path.startsWith("/admin")) {
    return fallback;
  }
  return path;
}

/** Where to send a user immediately after customer login/register. */
export function getPostAuthRedirect(
  role: "customer" | "admin",
  requestedRedirect: string | null | undefined,
): string {
  if (role === "admin") {
    return "/admin/dashboard";
  }
  return getSafeRedirect(requestedRedirect, "/");
}
