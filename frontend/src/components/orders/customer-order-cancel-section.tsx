"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";

import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog";
import { CancellationInfo } from "@/components/orders/cancellation-info";
import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CUSTOMER_CANCELLATION_REASONS } from "@/lib/cancellation-reasons";
import { canCustomerCancelOrder } from "@/lib/order-cancellation";
import type { Order } from "@/lib/types";

interface CustomerOrderCancelSectionProps {
  order: Order;
  orderNumber: string;
  onOrderUpdated: (order: Order) => void;
  prominent?: boolean;
}

export function CustomerOrderCancelSection({
  order,
  orderNumber,
  onOrderUpdated,
  prominent = false,
}: CustomerOrderCancelSectionProps) {
  const { isAuthenticated } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const canRequest = canCustomerCancelOrder(order.status, isAuthenticated);

  async function handleRequest(reason: string) {
    if (!isAuthenticated) return;
    setCancelling(true);
    setError("");
    try {
      const updated = await apiFetch<Order>(`/orders/${orderNumber}/cancel-request`, {
        method: "POST",
        body: { reason },
        auth: true,
      });
      onOrderUpdated(updated);
      setShowCancelDialog(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to request cancellation");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <CancellationInfo order={order} />

      {canRequest && (
        <div
          className={
            prominent
              ? "rounded-xl border border-destructive/25 bg-destructive/5 p-5"
              : "rounded-xl border border-border bg-card p-5"
          }
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading font-semibold text-foreground">Cancel Order</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can request cancellation while the order is pending or confirmed.
                An admin will review your request before the order is cancelled.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={cancelling}
            >
              <XCircle className="mr-2 size-4" />
              {cancelling ? "Submitting..." : "Cancel Order"}
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      )}

      <CancelOrderDialog
        open={showCancelDialog}
        title="Cancel Order"
        reasons={CUSTOMER_CANCELLATION_REASONS}
        loading={cancelling}
        onConfirm={handleRequest}
        onCancel={() => {
          setShowCancelDialog(false);
          setError("");
        }}
      />
    </>
  );
}
