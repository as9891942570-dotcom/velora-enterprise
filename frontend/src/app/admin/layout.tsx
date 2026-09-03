"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { useAdminAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isLoading, isAuthenticated } = useAdminAuth();

  const isLoginPage = pathname === "/admin/login";
  const isPublicAdminAuthPage =
    isLoginPage ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password";

  useEffect(() => {
    if (isPublicAdminAuthPage || isLoading) return;

    if (!isAuthenticated) {
      const redirect =
        pathname === "/admin" || pathname === "/admin/dashboard"
          ? ""
          : `?redirect=${encodeURIComponent(pathname)}`;
      router.replace(`/admin/login${redirect}`);
      return;
    }

    if (!isAdmin) {
      router.replace("/?error=admin_access_denied");
    }
  }, [isAdmin, isLoading, isAuthenticated, isPublicAdminAuthPage, pathname, router]);

  if (isPublicAdminAuthPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
