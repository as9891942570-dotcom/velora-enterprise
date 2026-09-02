"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { OrderTracker } from "@/components/orders/order-tracker";
import { CustomerOrderCancelSection } from "@/components/orders/customer-order-cancel-section";
import { BackLink } from "@/components/layout/back-link";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ButtonLink } from "@/components/ui/button-link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canCustomerCancelOrder } from "@/lib/order-cancellation";
import { formatDate, formatINR, formatStatus } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image-url";
import type { Order } from "@/lib/types";

export default function OrderConfirmationContent({ orderNumber }: { orderNumber: string }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setError("Please sign in to view your order confirmation.");
      setLoading(false);
      return;
    }

    apiFetch<Order>(`/orders/${orderNumber}`, { auth: true })
      .then(setOrder)
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, orderNumber]);

  if (authLoading || loading) return <LoadingSpinner />;

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-destructive">{error || "Order not found"}</p>
        <ButtonLink href="/shop" className="mt-4">
          Continue Shopping
        </ButtonLink>
      </div>
    );
  }

  const address = order.shipping_address;
  const showCancelCta = canCustomerCancelOrder(order.status, isAuthenticated);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <BackLink href="/orders">Back to My Orders</BackLink>

      <div className="mt-4 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 font-heading text-3xl font-semibold">
          {order.status === "pending" ? "Order Placed!" : "Order Update"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. Order #{order.order_number}
          {order.status === "pending" && " — awaiting store confirmation."}
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <CustomerOrderCancelSection
          order={order}
          orderNumber={orderNumber}
          onOrderUpdated={setOrder}
          prominent={showCancelCta}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">Order Items</h2>
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
                    <Link href={`/product/${item.product_slug}`} className="font-medium hover:text-primary">
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

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">Delivery Address</h2>
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
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.phone}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold">Order Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order date</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payment</dt>
                <dd>{formatStatus(order.payment_method)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payment status</dt>
                <dd>{formatStatus(order.payment_status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order status</dt>
                <dd>{formatStatus(order.status)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{formatINR(order.total_amount)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold">Tracking</h3>
            <div className="mt-4">
              <OrderTracker status={order.status} />
            </div>
          </div>

          <ButtonLink href={`/orders/${orderNumber}`} className="w-full">
            View Full Order Details
          </ButtonLink>
          <ButtonLink href="/orders" variant="outline" className="w-full">
            View All Orders
          </ButtonLink>
          <ButtonLink href="/shop" variant="outline" className="w-full">
            Continue Shopping
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
