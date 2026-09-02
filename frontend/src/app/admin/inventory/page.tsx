"use client";

import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ButtonLink } from "@/components/ui/button-link";
import { apiFetch } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

export default function AdminInventoryPage() {
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
  if (!stats) return <p className="text-destructive">Failed to load inventory data</p>;

  const { inventory, low_stock_products: lowStock } = stats;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Inventory</h1>
      <p className="mt-1 text-sm text-muted-foreground">Stock levels and alerts</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Products", value: inventory.total_products },
          { label: "In Stock", value: inventory.in_stock_count },
          { label: "Low Stock", value: inventory.low_stock_count },
          { label: "Out of Stock", value: inventory.out_of_stock_count, danger: true },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${item.danger ? "text-destructive" : ""}`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {lowStock.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">All products are well stocked.</p>
          <ButtonLink href="/admin/products" className="mt-4">
            Manage Products
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lowStock.map((product) => (
                <tr key={product.id} className="bg-card">
                  <td className="px-4 py-3">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.category_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatINR(product.price)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        product.is_out_of_stock
                          ? "rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground"
                          : "rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                      }
                    >
                      {product.is_out_of_stock ? "OUT OF STOCK" : `${product.stock_quantity} left`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ButtonLink
                      href={`/admin/products/${product.id}/edit`}
                      variant="outline"
                      size="sm"
                    >
                      Restock
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
