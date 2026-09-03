"use client";

import { Check } from "lucide-react";

import { formatStatus } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TRACK_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const STEP_LABELS: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

function stepIndex(status: OrderStatus): number {
  if (status === "cancelled" || status === "returned") return -1;
  const idx = TRACK_STEPS.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          <span className="flex size-6 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
            ✕
          </span>
          Status: Cancelled
        </div>
      </div>
    );
  }

  if (status === "cancellation_requested") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        Cancellation requested. Waiting for store approval.
      </div>
    );
  }

  const current = stepIndex(status);

  return (
    <ol className="space-y-0">
      {TRACK_STEPS.map((step, index) => {
        const completed = index <= current;
        const active = index === current;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-background text-primary"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                {completed ? <Check className="size-3.5" /> : index + 1}
              </div>
              {index < TRACK_STEPS.length - 1 && (
                <div
                  className={cn(
                    "my-1 w-0.5 flex-1 min-h-6",
                    index < current ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", index === TRACK_STEPS.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  active || completed ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {STEP_LABELS[step] ?? formatStatus(step)}
              </p>
              {active && step === "pending" && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Waiting for store confirmation
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
