"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/storefront/empty-state";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { apiFetch, buildQuery } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateShort, formatINR, formatStatus } from "@/lib/format";
import type { Order, PaginatedResponse } from "@/lib/types";

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login?redirect=/orders");
      return;
    }

    apiFetch<PaginatedResponse<Order>>(`/orders${buildQuery({ page_size: 50 })}`, { auth: true })
      .then((data) => setOrders(data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || loading) return <LoadingSpinner />;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="When you place an order, it will appear here."
        actionLabel="Start Shopping"
        actionHref="/shop"
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-foreground">My Orders</h1>

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.order_number}`}
            className="block rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono font-semibold text-foreground">#{order.order_number}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateShort(order.created_at)} · {order.items.length} items
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatINR(order.total_amount)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatStatus(order.status)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
