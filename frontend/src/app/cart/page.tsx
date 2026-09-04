"use client";

import { useCallback, useEffect, useState } from "react";

import { CartItemRow } from "@/components/cart/cart-item-row";
import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/storefront/empty-state";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ButtonLink } from "@/components/ui/button-link";
import { apiFetch, notifyCartChanged } from "@/lib/api";
import { loadCartShared } from "@/lib/cart-api";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/format";
import type { Cart } from "@/lib/types";

export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadCartShared(isAuthenticated);
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const data = await loadCartShared(isAuthenticated);
        if (!cancelled) setCart(data);
      } catch {
        if (!cancelled) setCart(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  async function updateQuantity(itemId: string, quantity: number) {
    setUpdatingId(itemId);
    try {
      const data = await apiFetch<Cart>(`/cart/items/${itemId}`, {
        method: "PATCH",
        body: { quantity },
        auth: isAuthenticated,
      });
      setCart(data);
      notifyCartChanged();
    } catch {
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(itemId: string) {
    setUpdatingId(itemId);
    try {
      const data = await apiFetch<Cart>(`/cart/items/${itemId}`, {
        method: "DELETE",
        auth: isAuthenticated,
      });
      setCart(data);
      notifyCartChanged();
    } catch {
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading || loading) return <LoadingSpinner />;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse our collection and add items to your cart."
        actionLabel="Continue Shopping"
        actionHref="/shop"
      />
    );
  }

  const shipping = cart.shipping_amount ?? "0";
  const total = cart.total_amount ?? cart.subtotal;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <BackLink href="/shop">Back to Shop</BackLink>
      <h1 className="font-heading mt-4 text-3xl font-semibold text-foreground">Shopping Cart</h1>
      <p className="mt-2 text-sm text-muted-foreground">{cart.item_count} items</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {cart.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              isUpdating={updatingId === item.id}
              onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-heading text-lg font-semibold">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping estimate</span>
              <span>{parseFloat(shipping) === 0 ? "Free" : formatINR(shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
          <ButtonLink href="/checkout" className="mt-6 w-full" size="lg">
            Proceed to Checkout
          </ButtonLink>
          <ButtonLink href="/shop" variant="outline" className="mt-3 w-full">
            Continue Shopping
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
