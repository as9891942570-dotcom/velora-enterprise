"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image-url";
import type { CartItem } from "@/lib/types";

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating,
}: {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  isUpdating?: boolean;
}) {
  const imageSrc = resolveImageUrl(item.image_url);

  return (
    <div className="flex gap-4 border-b border-border py-4 last:border-0">
      <Link
        href={`/product/${item.product_slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-secondary/50 sm:size-24"
      >
        {imageSrc ? (
          <Image src={imageSrc} alt={item.product_name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No img
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/product/${item.product_slug}`}
          className="font-heading font-medium text-foreground hover:text-primary"
        >
          {item.product_name}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">{formatINR(item.unit_price)} each</p>
        {!item.in_stock && (
          <p className="mt-1 text-xs text-destructive">Out of stock</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-4 pt-3">
          <div className="flex items-center gap-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              disabled={isUpdating || item.quantity >= item.stock_quantity}
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{formatINR(item.line_total)}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              disabled={isUpdating}
              aria-label="Remove item"
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
