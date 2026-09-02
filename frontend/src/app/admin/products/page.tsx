"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { apiFetch, buildQuery } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { PaginatedResponse, Product } from "@/lib/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await apiFetch<PaginatedResponse<Product>>(
        `/admin/products${buildQuery({ page_size: 100 })}`,
        { auth: true },
      );
      setProducts(data.items);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/admin/products/${id}`, { method: "DELETE", auth: true });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete product");
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <Button render={<Link href="/admin/products/new" />} className="gap-1.5">
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="bg-card">
                <td className="px-4 py-3">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.slug}</p>
                </td>
                <td className="px-4 py-3">{formatINR(product.price)}</td>
                <td className="px-4 py-3">{product.stock_quantity}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      product.is_active
                        ? "text-green-700"
                        : "text-muted-foreground"
                    }
                  >
                    {product.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      render={<Link href={`/admin/products/${product.id}/edit`} />}
                      variant="ghost"
                      size="icon-sm"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
