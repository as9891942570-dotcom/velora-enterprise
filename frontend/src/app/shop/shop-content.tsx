"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/storefront/empty-state";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Button } from "@/components/ui/button";
import { apiFetch, buildQuery } from "@/lib/api";
import type { Category, PaginatedResponse, ProductListItem } from "@/lib/types";

export default function ShopPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PaginatedResponse<ProductListItem>>(
        `/products${buildQuery({ search: search || undefined, category: category || undefined, page, page_size: 20 })}`,
      );
      setProducts(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => {
    apiFetch<PaginatedResponse<Category>>(`/categories${buildQuery({ page_size: 50 })}`)
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/shop?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search, page: "1" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-foreground">Shop</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our collection of premium home decor
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>
        <select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value, page: "1" })}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your search or filters."
          actionLabel="View all products"
          actionHref="/shop"
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{total} products</p>
          <ProductGrid products={products} />
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                disabled={page >= pages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
