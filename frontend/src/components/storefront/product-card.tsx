import Image from "next/image";
import Link from "next/link";

import { formatINR } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image-url";
import type { ProductListItem } from "@/lib/types";import { cn } from "@/lib/utils";

export function ProductCard({ product, className }: { product: ProductListItem; className?: string }) {
  const hasDiscount =
    product.compare_at_price &&
    parseFloat(product.compare_at_price) > parseFloat(product.price);

  const imageSrc = resolveImageUrl(product.primary_image_url);

  return (    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/50">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        {product.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            Featured
          </span>
        )}
        {product.stock_quantity === 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-destructive/90 px-2.5 py-0.5 text-xs font-medium text-white">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-base font-medium text-foreground line-clamp-2 group-hover:text-primary">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-sm font-semibold text-foreground">
            {formatINR(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(product.compare_at_price!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
