"use client";

import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ButtonLink } from "@/components/ui/button-link";
import { ApiRequestError, apiFetch, buildQuery } from "@/lib/api";
import { useAdminAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/format";
import type { PaginatedResponse, Product } from "@/lib/types";

const LOW_STOCK_THRESHOLD = 5;

function stockLabel(qty: number): { text: string; className: string } {
  if (qty <= 0) {
    return {
      text: "Out of stock",
      className: "rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground",
    };
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return {
      text: "Low stock",
      className: "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    };
  }
  return {
    text: "In stock",
    className: "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  };
}

export default function AdminInventoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setError("Not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    apiFetch<PaginatedResponse<Product>>(
      `/admin/products${buildQuery({ page_size: 100 })}`,
      { auth: true, authScope: "admin" },
    )
      .then((data) => setProducts(data.items))
      .catch((err) => {
        setProducts([]);
        setError(err instanceof ApiRequestError ? err.detail : "Failed to load inventory");
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">Failed to load inventory</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const inStock = products.filter((p) => p.stock_quantity > LOW_STOCK_THRESHOLD).length;
  const lowStock = products.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD,
  ).length;
  const outOfStock = products.filter((p) => p.stock_quantity <= 0).length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Inventory</h1>
      <p className="mt-1 text-sm text-muted-foreground">Stock levels and alerts</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Products", value: products.length },
          { label: "In Stock", value: inStock },
          { label: "Low Stock", value: lowStock },
          { label: "Out of Stock", value: outOfStock, danger: true },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className={`mt-1 text-2xl font-semibold ${item.danger ? "text-destructive" : ""}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No products yet.</p>
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
                <th className="px-4 py-3 text-left font-medium">Stock qty</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...products]
                .sort((a, b) => a.stock_quantity - b.stock_quantity)
                .map((product) => {
                  const status = stockLabel(product.stock_quantity);
                  return (
                    <tr key={product.id} className="bg-card">
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{formatINR(product.price)}</td>
                      <td className="px-4 py-3 font-medium">{product.stock_quantity}</td>
                      <td className="px-4 py-3">
                        <span className={status.className}>{status.text}</span>
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
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
