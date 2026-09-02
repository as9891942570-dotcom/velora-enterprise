"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Package, Truck, X } from "lucide-react";

import { BackLink } from "@/components/layout/back-link";
import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog";
import { CancellationInfo } from "@/components/orders/cancellation-info";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { ADMIN_CANCELLATION_REASONS } from "@/lib/cancellation-reasons";
import { formatDate, formatINR, formatStatus } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image-url";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type PendingAction =
  | { type: "confirm" }
  | { type: "processing" }
  | { type: "shipped" }
  | { type: "out_for_delivery" }
  | { type: "delivered" };

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Partial<Record<OrderStatus, string>> = {
    pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    confirmed: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    processing: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
    shipped: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
    out_for_delivery: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
    delivered: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
    cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        styles[status] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatAddressType(type?: string | null) {
  if (!type) return null;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function AdminOrderDetailContent({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [shippingPartner, setShippingPartner] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showShipForm, setShowShipForm] = useState(false);

  useEffect(() => {
    apiFetch<Order>(`/admin/orders/${orderId}`, { auth: true })
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function updateStatus(
    status: OrderStatus,
    note: string,
    extra?: {
      shipping_partner?: string;
      tracking_number?: string;
      cancellation_reason?: string;
    },
  ) {
    setUpdating(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiFetch<Order>(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: {
          status,
          note: note || null,
          cancellation_reason: extra?.cancellation_reason ?? null,
          shipping_partner: extra?.shipping_partner ?? null,
          tracking_number: extra?.tracking_number ?? null,
        },
        auth: true,
      });
      setOrder(updated);
      setSuccess(
        status === "cancelled"
          ? "Order cancelled successfully."
          : `Order marked as ${formatStatus(status).toLowerCase()}.`,
      );
      setShowShipForm(false);
      setShippingPartner("");
      setTrackingNumber("");
      setShowCancelDialog(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to update status");
    } finally {
      setUpdating(false);
      setPendingAction(null);
    }
  }

  async function handleAdminCancel(reason: string) {
    await updateStatus("cancelled", reason, { cancellation_reason: reason });
  }

  async function handleConfirmAction() {
    if (!pendingAction || !order) return;
    switch (pendingAction.type) {
      case "confirm":
        await updateStatus("confirmed", "Confirmed by admin");
        break;
      case "processing":
        await updateStatus("processing", "Processing started");
        break;
      case "shipped":
        await updateStatus("shipped", "Order shipped", {
          shipping_partner: shippingPartner || undefined,
          tracking_number: trackingNumber || undefined,
        });
        break;
      case "out_for_delivery":
        await updateStatus("out_for_delivery", "Out for delivery");
        break;
      case "delivered":
        await updateStatus("delivered", "Order delivered");
        break;
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!order) {
    return (
      <div>
        <BackLink href="/admin/orders">Back to Orders</BackLink>
        <p className="mt-4 text-destructive">Order not found</p>
      </div>
    );
  }

  const address = order.shipping_address;

  return (
    <div>
      <BackLink href="/admin/orders">Back to Orders</BackLink>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Order #{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
          {success}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Order Information</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Order ID</dt>
                <dd className="font-mono font-medium">{order.order_number}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Order Date</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{formatStatus(order.status)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Order Items</h2>
            <div className="mt-4 divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
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
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × {formatINR(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium">{formatINR(item.line_total)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Admin Actions</h2>

            {order.status === "pending" && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  This order is awaiting confirmation. Review the details, then confirm or cancel.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setPendingAction({ type: "confirm" })} disabled={updating}>
                    <Check className="mr-2 size-4" />
                    Confirm Order
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={updating}
                  >
                    <X className="mr-2 size-4" />
                    Cancel Order
                  </Button>
                </div>
              </div>
            )}

            {order.status === "confirmed" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => setPendingAction({ type: "processing" })} disabled={updating}>
                  <Package className="mr-2 size-4" />
                  Start Processing
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={updating}
                >
                  <X className="mr-2 size-4" />
                  Cancel Order
                </Button>
              </div>
            )}

            {order.status === "processing" && (
              <div className="mt-4 space-y-4">
                {!showShipForm ? (
                  <Button onClick={() => setShowShipForm(true)} disabled={updating}>
                    <Truck className="mr-2 size-4" />
                    Mark as Shipped
                  </Button>
                ) : (
                  <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">
                      Optionally add shipping details before marking as shipped.
                    </p>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Shipping Partner / Courier
                      </label>
                      <input
                        value={shippingPartner}
                        onChange={(e) => setShippingPartner(e.target.value)}
                        placeholder="e.g. Delhivery, Blue Dart"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Tracking Number</label>
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking ID"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setPendingAction({ type: "shipped" })}
                        disabled={updating}
                      >
                        Mark as Shipped
                      </Button>
                      <Button variant="outline" onClick={() => setShowShipForm(false)} disabled={updating}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {order.status === "shipped" && (
              <div className="mt-4">
                <Button onClick={() => setPendingAction({ type: "out_for_delivery" })} disabled={updating}>
                  <Truck className="mr-2 size-4" />
                  Mark Out for Delivery
                </Button>
              </div>
            )}

            {order.status === "out_for_delivery" && (
              <div className="mt-4">
                <Button onClick={() => setPendingAction({ type: "delivered" })} disabled={updating}>
                  <Check className="mr-2 size-4" />
                  Mark as Delivered
                </Button>
              </div>
            )}

            {order.status === "delivered" && (
              <p className="mt-4 text-sm text-green-700 dark:text-green-300">
                Order successfully delivered.
              </p>
            )}

            {order.status === "cancelled" && (
              <p className="mt-4 text-sm text-muted-foreground">
                This order has been cancelled. See cancellation details below.
              </p>
            )}
          </section>

          {order.status === "cancelled" && <CancellationInfo order={order} />}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Customer</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{order.customer_email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{order.customer_phone}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Delivery Address</h2>
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
                  <span className="text-foreground">
                    Type: {formatAddressType(address.address_type)}
                  </span>
                </>
              )}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Order Summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatINR(order.shipping_amount)}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatINR(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Grand Total</span>
                <span>{formatINR(order.total_amount)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading font-semibold">Payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Method</dt>
                <dd>{formatStatus(order.payment_method)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{formatStatus(order.payment_status)}</dd>
              </div>
              {order.payment?.razorpay_payment_id && (
                <div>
                  <dt className="text-muted-foreground">Payment ID</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">
                    {order.payment.razorpay_payment_id}
                  </dd>
                </div>
              )}
              {order.payment?.razorpay_order_id && (
                <div>
                  <dt className="text-muted-foreground">Razorpay Order</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">
                    {order.payment.razorpay_order_id}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {(order.shipping_partner || order.tracking_number || order.shipped_at) && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-heading font-semibold">Shipping</h2>
              <dl className="mt-3 space-y-2 text-sm">
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
            </section>
          )}
        </div>
      </div>

      <CancelOrderDialog
        open={showCancelDialog}
        title="Cancel Order"
        reasons={ADMIN_CANCELLATION_REASONS}
        loading={updating}
        onConfirm={handleAdminCancel}
        onCancel={() => setShowCancelDialog(false)}
      />

      <ConfirmDialog
        open={pendingAction?.type === "delivered"}
        title="Confirm Delivery"
        message="Are you sure this order has been delivered?"
        confirmLabel="Confirm Delivery"
        cancelLabel="Go Back"
        loading={updating}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={
          pendingAction?.type === "confirm" ||
          pendingAction?.type === "processing" ||
          pendingAction?.type === "shipped" ||
          pendingAction?.type === "out_for_delivery"
        }
        title={
          pendingAction?.type === "confirm"
            ? "Confirm Order"
            : pendingAction?.type === "processing"
              ? "Start Processing"
              : pendingAction?.type === "shipped"
                ? "Mark as Shipped"
                : "Mark Out for Delivery"
        }
        message={
          pendingAction?.type === "confirm"
            ? "Confirm this order to begin fulfillment?"
            : pendingAction?.type === "processing"
              ? "Move this order to processing?"
              : pendingAction?.type === "shipped"
                ? "Mark this order as shipped?"
                : "Mark this order as out for delivery?"
        }
        confirmLabel={
          pendingAction?.type === "confirm"
            ? "Confirm Order"
            : pendingAction?.type === "processing"
              ? "Start Processing"
              : pendingAction?.type === "shipped"
                ? "Mark as Shipped"
                : "Mark Out for Delivery"
        }
        loading={updating}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
