"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch, buildQuery, notifyAdminNotificationsChanged } from "@/lib/api";
import { formatDate, formatINR, formatStatus } from "@/lib/format";
import type { Order, PaginatedResponse } from "@/lib/types";

export default function AdminCancellationRequestsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<Order>>(
      `/admin/cancellation-requests${buildQuery({ page_size: 50, pending_only: pendingOnly })}`,
      { auth: true },
    )
      .then((data) => setOrders(data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [pendingOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(orderId: string, action: "approve" | "reject") {
    const note =
      action === "reject"
        ? window.prompt("Optional note for the customer:") ?? ""
        : "";
    setUpdatingId(orderId);
    setError("");
    try {
      await apiFetch<Order>(`/admin/cancellation-requests/${orderId}/${action}`, {
        method: "POST",
        body: { note: note.trim() || null },
        auth: true,
      });
      notifyAdminNotificationsChanged();
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Action failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Cancellation Requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Approve or reject customer cancellation requests
      </p>

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          Pending only
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No cancellation requests.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Requested</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3">{formatINR(order.total_amount)}</td>
                  <td className="px-4 py-3 max-w-xs">{order.cancellation_reason}</td>
                  <td className="px-4 py-3">
                    {order.cancellation_requested_at
                      ? formatDate(order.cancellation_requested_at)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{formatStatus(order.status)}</td>
                  <td className="px-4 py-3">
                    {order.status === "cancellation_requested" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => decide(order.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingId === order.id}
                          onClick={() => decide(order.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
