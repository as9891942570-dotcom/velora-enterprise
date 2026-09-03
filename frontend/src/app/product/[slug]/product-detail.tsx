"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";

import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { apiFetch, notifyCartChanged } from "@/lib/api";
import { addGuestCartItem } from "@/lib/cart-storage";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image-url";
import type { Cart, Product } from "@/lib/types";
import { ProductReviews } from "@/components/storefront/product-reviews";

export function ProductDetailClient({ product }: { product: Product }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const primaryImage = product.images[0];
  const primaryImageSrc = primaryImage ? resolveImageUrl(primaryImage.url) : null;
  const hasDiscount =
    product.compare_at_price &&
    parseFloat(product.compare_at_price) > parseFloat(product.price);
  const inStock = product.stock_quantity > 0;

  async function handleAddToCart() {
    if (authLoading) return;
    setAdding(true);
    setError("");
    try {
      await apiFetch<Cart>("/cart/items", {
        method: "POST",
        body: { product_id: product.id, quantity },
        auth: isAuthenticated,
      });
      if (!isAuthenticated) {
        addGuestCartItem(product.id, quantity);
      }
      notifyCartChanged();
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <BackLink href="/shop" className="mb-6">
        Back to Shop
      </BackLink>

      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/category/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary/30">
          {primaryImageSrc ? (
            <Image
              src={primaryImageSrc}
              alt={primaryImage?.alt_text ?? product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="font-heading text-3xl font-semibold text-foreground">{product.name}</h1>
          {product.material && (
            <p className="mt-2 text-sm text-muted-foreground">Material: {product.material}</p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-foreground">
              {formatINR(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-lg text-muted-foreground line-through">
                {formatINR(product.compare_at_price!)}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            {inStock ? (
              <span className="text-green-700">{product.stock_quantity} in stock</span>
            ) : (
              <span className="text-destructive">Out of stock</span>
            )}
          </p>

          {product.short_description && (
            <p className="mt-6 text-muted-foreground">{product.short_description}</p>
          )}

          {inStock && (
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-lg border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={quantity >= product.stock_quantity}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={adding}
              >
                <ShoppingBag className="size-4" />
                {added ? "Added!" : adding ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          {product.description && (
            <div className="mt-10 border-t border-border pt-8">
              <h2 className="font-heading text-lg font-semibold">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} />
    </div>
  );
}
