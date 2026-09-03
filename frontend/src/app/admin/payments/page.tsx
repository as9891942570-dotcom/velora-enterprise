"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/admin/stat-card";
import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { ApiRequestError, apiFetch, buildQuery } from "@/lib/api";
import { formatDateShort, formatINR, formatStatus } from "@/lib/format";
import type { PaymentListResponse } from "@/lib/types";

const FILTERS = [
  { value: "", label: "All Payments" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch<PaymentListResponse>(
      `/admin/payments${buildQuery({
        page_size: 50,
        status: status || undefined,
        search: search || undefined,
      })}`,
      { auth: true, authScope: "admin" },
    )
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err instanceof ApiRequestError ? err.detail : "Failed to load payments");
      })
      .finally(() => setLoading(false));
  }, [status, search]);

  if (loading && !data) return <LoadingSpinner />;

  if (!data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">Failed to load payments</p>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Unknown error"}</p>
      </div>
    );
  }

  const summary = data.summary;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">Order payment records from the live database</p>

      {summary && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Total Revenue" value={formatINR(summary.total_revenue)} />
          <StatCard title="Successful" value={summary.successful_payments} />
          <StatCard title="Pending" value={summary.pending_payments} />
          <StatCard title="Failed" value={summary.failed_payments} />
          <StatCard title="Refunded" value={formatINR(summary.refunded_amount)} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number or customer"
          className="h-9 min-w-64 rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Method</th>
              <th className="px-4 py-3 text-left font-medium">Payment</th>
              <th className="px-4 py-3 text-left font-medium">Order status</th>
              <th className="px-4 py-3 text-left font-medium">Transaction ID</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.order_id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/admin/orders/${row.order_id}`} className="hover:underline">
                    {row.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div>{row.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{row.customer_email}</div>
                </td>
                <td className="px-4 py-3">{formatINR(row.total_amount)}</td>
                <td className="px-4 py-3">{formatStatus(row.payment_method)}</td>
                <td className="px-4 py-3">{formatStatus(row.payment_status)}</td>
                <td className="px-4 py-3">{formatStatus(row.order_status)}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.transaction_id ?? "—"}</td>
                <td className="px-4 py-3">{formatDateShort(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
