"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminArea) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton variant="floating" />
    </>
  );
}
