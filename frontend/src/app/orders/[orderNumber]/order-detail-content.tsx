"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { OrderTracker } from "@/components/orders/order-tracker";
import { CustomerOrderCancelSection } from "@/components/orders/customer-order-cancel-section";
import { BackLink } from "@/components/layout/back-link";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { apiFetch, buildQuery } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canCustomerCancelOrder } from "@/lib/order-cancellation";
import { formatDate, formatINR, formatStatus } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image-url";
import type { Order } from "@/lib/types";

export default function OrderDetailContent({ orderNumber }: { orderNumber: string }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function loadOrder(email?: string) {
      try {
        const query = email ? buildQuery({ email }) : "";
        const data = await apiFetch<Order>(
          `/orders/${orderNumber}${query}`,
          { auth: isAuthenticated },
        );
        setOrder(data);
        setError("");
      } catch {
        if (!isAuthenticated) {
          setShowEmailForm(true);
          setError("Enter your email to view this order");
        } else {
          setError("Order not found");
        }
      } finally {
        setLoading(false);
      }
    }

    const email = searchParams.get("email");
    if (email) {
      loadOrder(email);
    } else if (isAuthenticated) {
      loadOrder();
    } else {
      setShowEmailForm(true);
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, orderNumber, searchParams]);

  function handleGuestLookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    apiFetch<Order>(`/orders/${orderNumber}${buildQuery({ email: guestEmail })}`)
      .then(setOrder)
      .catch(() => setError("Order not found for this email"))
      .finally(() => setLoading(false));
  }

  if (authLoading || loading) return <LoadingSpinner />;

  if (showEmailForm && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-heading text-2xl font-semibold">View Order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email used when placing order #{orderNumber}
        </p>
        <form onSubmit={handleGuestLookup} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="Email address"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            View Order
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:underline">
            Sign in
          </Link>{" "}
          to cancel or manage this order
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-destructive">{error || "Order not found"}</p>
        <Button render={<Link href="/shop" />} className="mt-4">
          Continue Shopping
        </Button>
      </div>
    );
  }

  const address = order.shipping_address;
  const showCancelCta = canCustomerCancelOrder(order.status, isAuthenticated);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <BackLink href="/orders">Back to My Orders</BackLink>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Order #{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed on {formatDate(order.created_at)}</p>
        </div>
        <div className="rounded-lg bg-secondary/60 px-4 py-2 text-sm">
          <span className="font-medium">{formatStatus(order.status)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-muted-foreground">{formatStatus(order.payment_status)}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <CustomerOrderCancelSection
          order={order}
          orderNumber={orderNumber}
          onOrderUpdated={setOrder}
          prominent={showCancelCta}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold">Items</h2>
          <div className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary/50">
                  {resolveImageUrl(item.image_url) && (
                    <Image
                      src={resolveImageUrl(item.image_url)!}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/product/${item.product_slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {item.product_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × {formatINR(item.unit_price)}
                  </p>
                </div>
                <p className="font-medium">{formatINR(item.line_total)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold">Order Tracking</h3>
            <div className="mt-4">
              <OrderTracker status={order.status} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold">Summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatINR(order.shipping_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span>{formatINR(order.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold">Shipping Address</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {address.full_name}
              <br />
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              {address.landmark && (
                <>
                  <br />
                  Landmark: {address.landmark}
                </>
              )}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.phone}
              {address.address_type && (
                <>
                  <br />
                  Type: {address.address_type.charAt(0).toUpperCase() + address.address_type.slice(1)}
                </>
              )}
            </p>
          </div>

          {(order.shipping_partner || order.tracking_number) && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading font-semibold">Shipping Details</h3>
              <dl className="mt-2 space-y-1 text-sm">
                {order.shipping_partner && (
                  <div>
                    <dt className="text-muted-foreground">Courier</dt>
                    <dd>{order.shipping_partner}</dd>
                  </div>
                )}
                {order.tracking_number && (
                  <div>
                    <dt className="text-muted-foreground">Tracking Number</dt>
                    <dd className="font-mono">{order.tracking_number}</dd>
                  </div>
                )}
                {order.shipped_at && (
                  <div>
                    <dt className="text-muted-foreground">Shipped On</dt>
                    <dd>{formatDate(order.shipped_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
