import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/storefront/product-grid";
import { buildQuery, serverFetch } from "@/lib/api";
import type { Category, PaginatedResponse, ProductListItem } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  let category: Category;
  try {
    category = await serverFetch<Category>(`/categories/${slug}`);
  } catch {
    notFound();
  }

  let products: ProductListItem[] = [];
  try {
    const data = await serverFetch<PaginatedResponse<ProductListItem>>(
      `/products${buildQuery({ category: slug, page_size: 50 })}`,
    );
    products = data.items;
  } catch {
    products = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-foreground">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
        )}
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No products in this category yet.
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
