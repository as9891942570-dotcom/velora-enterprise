import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PUBLIC_PATHS = ["/admin/login"];

function isAdminProtectedPath(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  return !ADMIN_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasAdminCookie = request.cookies.has("admin_refresh_token");
  if (!hasAdminCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
