"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  AlertTriangle,
  ExternalLink,
  Mail,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/inventory", label: "Inventory", icon: AlertTriangle },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-r border-border bg-card lg:w-64 lg:shrink-0">
      <div className="border-b border-border px-6 py-5">
        <Link href="/admin/dashboard" className="font-heading text-lg font-semibold text-foreground">
          Velora Admin
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">Store management</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
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
              {label}
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
