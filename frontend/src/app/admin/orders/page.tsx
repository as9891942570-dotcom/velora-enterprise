"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { apiFetch, buildQuery } from "@/lib/api";
import { formatDateShort, formatINR, formatStatus } from "@/lib/format";
import type { Order, OrderStatus, PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancellation_requested", label: "Cancellation Requested" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<Order>>(
      `/admin/orders${buildQuery({ page_size: 100, status: statusFilter || undefined })}`,
      { auth: true },
    )
      .then((data) => setOrders(data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  if (loading) return <LoadingSpinner />;

  function statusColor(status: OrderStatus) {
    const colors: Partial<Record<OrderStatus, string>> = {
      pending: "text-amber-700 dark:text-amber-300",
      confirmed: "text-blue-700 dark:text-blue-300",
      processing: "text-indigo-700 dark:text-indigo-300",
      shipped: "text-purple-700 dark:text-purple-300",
      out_for_delivery: "text-orange-700 dark:text-orange-300",
      delivered: "text-green-700 dark:text-green-300",
      cancelled: "text-red-700 dark:text-red-300",
      cancellation_requested: "text-amber-700 dark:text-amber-300",
    };
    return colors[status] ?? "";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{orders.length} orders</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
                className="cursor-pointer bg-card hover:bg-muted/30"
              >
                <td className="px-4 py-3 font-mono font-medium">#{order.order_number}</td>
                <td className="px-4 py-3">
                  <p>{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateShort(order.created_at)}
                </td>
                <td className={cn("px-4 py-3 font-medium", statusColor(order.status))}>
                  {formatStatus(order.status)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatINR(order.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
