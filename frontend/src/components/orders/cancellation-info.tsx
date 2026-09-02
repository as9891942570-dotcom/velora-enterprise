import { cancelledByLabel } from "@/lib/cancellation-reasons";
import { formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

export function CancellationInfo({ order }: { order: Order }) {
  if (order.status !== "cancelled" || !order.cancellation_reason) {
    return null;
  }

  const cancelledBy = cancelledByLabel(order.cancelled_by_role);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
      <h3 className="font-heading font-semibold text-red-900 dark:text-red-100">
        Status: Cancelled
      </h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Cancelled By</dt>
          <dd className="font-medium">{cancelledBy}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cancellation Reason</dt>
          <dd>{order.cancellation_reason}</dd>
        </div>
        {order.cancelled_at && (
          <div>
            <dt className="text-muted-foreground">Cancelled Date &amp; Time</dt>
            <dd>{formatDate(order.cancelled_at)}</dd>
          </div>
        )}
        {order.status_before_cancel && (
          <div>
            <dt className="text-muted-foreground">Previous Status</dt>
            <dd className="capitalize">{order.status_before_cancel.replace(/_/g, " ")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
