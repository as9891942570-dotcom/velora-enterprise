import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/components/storefront/product-grid";
import { Button } from "@/components/ui/button";
import { buildQuery, serverFetch } from "@/lib/api";
import type { Category, PaginatedResponse, ProductListItem } from "@/lib/types";

async function getFeaturedProducts(): Promise<ProductListItem[]> {
  try {
    const data = await serverFetch<PaginatedResponse<ProductListItem>>(
      `/products${buildQuery({ featured: true, page_size: 8 })}`,
    );
    return data.items;
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const data = await serverFetch<PaginatedResponse<Category>>(
      `/categories${buildQuery({ page_size: 6 })}`,
    );
    return data.items;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Premium Home Decor
          </p>
          <h1 className="font-heading mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Crafted elegance for every corner of your home
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Velora Enterprise brings you thoughtfully designed flower pots, lotus aasan,
            decorative keychains, and home decor pieces — made with quality and care.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button render={<Link href="/shop" />} size="lg" className="min-w-[160px]">
              Shop Now
            </Button>
            <Button render={<Link href="/about" />} variant="outline" size="lg" className="min-w-[160px]">
              Our Story
            </Button>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
                Shop by Category
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore our curated collections
              </p>
            </div>
            <Button render={<Link href="/shop" />} variant="ghost" className="hidden sm:inline-flex">
              View all
            </Button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-shadow hover:shadow-md"
              >
                <div className="relative mb-3 size-16 overflow-hidden rounded-full bg-secondary/60">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="border-t border-border bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
                  Featured Products
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Handpicked favourites from our collection
                </p>
              </div>
              <Button render={<Link href="/shop" />} variant="ghost" className="hidden sm:inline-flex">
                View all
              </Button>
            </div>
            <div className="mt-8">
              <ProductGrid products={featuredProducts} />
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Quality you can trust
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Every piece is crafted with attention to detail. Free shipping on orders above ₹999.
          Cash on delivery available across India.
        </p>
        <Button render={<Link href="/shop" />} className="mt-6" size="lg">
          Start Shopping
        </Button>
      </section>
    </div>
  );
}
