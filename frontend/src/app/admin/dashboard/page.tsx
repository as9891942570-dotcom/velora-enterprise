"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ButtonLink } from "@/components/ui/button-link";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { formatDateShort, formatINR, formatStatus } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const { isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch<DashboardStats>("/admin/dashboard/stats", { auth: true, authScope: "admin" })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) return <LoadingSpinner />;
  if (!stats) return <p className="text-destructive">Failed to load dashboard</p>;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Overview of your store performance</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Revenue"
          value={formatINR(stats.total_revenue)}
          icon={<IndianRupee className="size-5" />}
        />
        <StatCard
          title="Total Orders"
          value={stats.total_orders}
          icon={<ShoppingBag className="size-5" />}
        />
        <StatCard
          title="Total Customers"
          value={stats.total_customers}
          icon={<Users className="size-5" />}
        />
        <StatCard
          title="Total Products"
          value={stats.total_products}
          icon={<Package className="size-5" />}
        />
        <StatCard
          title="Pending Orders"
          value={stats.pending_orders}
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          title="Low Stock Products"
          value={stats.inventory.low_stock_count + stats.inventory.out_of_stock_count}
          icon={<AlertTriangle className="size-5" />}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Revenue Today
          </p>
          <p className="mt-1 text-lg font-semibold">{formatINR(stats.revenue_today)}</p>
          <p className="text-xs text-muted-foreground">{stats.orders_today} orders</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Revenue This Month
          </p>
          <p className="mt-1 text-lg font-semibold">{formatINR(stats.revenue_this_month)}</p>
          <p className="text-xs text-muted-foreground">{stats.orders_this_month} orders</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            In Stock
          </p>
          <p className="mt-1 text-lg font-semibold">{stats.inventory.in_stock_count}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Out of Stock
          </p>
          <p className="mt-1 text-lg font-semibold text-destructive">
            {stats.inventory.out_of_stock_count}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Recent Orders</h2>
            <ButtonLink href="/admin/orders" variant="ghost" size="sm">
              View All Orders
            </ButtonLink>
          </div>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {stats.recent_orders.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No recent orders</p>
            ) : (
              stats.recent_orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium">#{order.order_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.customer_name} · {formatDateShort(order.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">{formatINR(order.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatStatus(order.payment_method)} · {formatStatus(order.status)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Low Stock Alerts</h2>
            <ButtonLink href="/admin/inventory" variant="ghost" size="sm">
              View Inventory
            </ButtonLink>
          </div>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {stats.low_stock_products.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">All products well stocked</p>
            ) : (
              stats.low_stock_products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.category_name ?? "Uncategorized"} · {formatINR(product.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        product.is_out_of_stock
                          ? "rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground"
                          : "rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                      }
                    >
                      {product.is_out_of_stock ? "OUT OF STOCK" : `${product.stock_quantity} left`}
                    </span>
                    <ButtonLink
                      href={`/admin/products/${product.id}/edit`}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </ButtonLink>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
