"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  AlertTriangle,
  ExternalLink,
  Mail,
  Star,
  CreditCard,
  Ban,
} from "lucide-react";

import { ADMIN_NOTIFICATIONS_CHANGED, apiFetch } from "@/lib/api";
import type { AdminNotificationCounts } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badgeKey: "new_orders" as const },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reviews", label: "Reviews", icon: Star, badgeKey: "unread_reviews" as const },
  {
    href: "/admin/cancellation-requests",
    label: "Cancellation Requests",
    icon: Ban,
    badgeKey: "pending_cancellations" as const,
  },
  { href: "/admin/messages", label: "Messages", icon: Mail, badgeKey: "unread_messages" as const },
  { href: "/admin/inventory", label: "Inventory", icon: AlertTriangle },
];

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<AdminNotificationCounts | null>(null);

  useEffect(() => {
    function load() {
      apiFetch<AdminNotificationCounts>("/admin/notifications/counts", {
        auth: true,
        authScope: "admin",
      })
        .then(setCounts)
        .catch(() => setCounts(null));
    }
    load();
    window.addEventListener(ADMIN_NOTIFICATIONS_CHANGED, load);
    return () => window.removeEventListener(ADMIN_NOTIFICATIONS_CHANGED, load);
    // Fetch on mount + after admin actions — not on every pathname change.
  }, []);

  return (
    <aside className="flex w-full flex-col border-r border-border bg-card lg:w-64 lg:shrink-0">
      <div className="border-b border-border px-6 py-5">
        <Link href="/admin/dashboard" className="font-heading text-lg font-semibold text-foreground">
          Velora Admin
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">Store management</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map(({ href, label, icon: Icon, exact, badgeKey }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          const count = badgeKey && counts ? counts[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {!isActive && <Badge count={count} />}
              {isActive && count > 0 && (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          View storefront
        </Link>
      </div>
    </aside>
  );
}
