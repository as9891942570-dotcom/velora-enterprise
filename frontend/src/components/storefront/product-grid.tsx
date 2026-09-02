import type { ProductListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  className,
}: {
  products: ProductListItem[];
  className?: string;
}) {
  if (products.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
