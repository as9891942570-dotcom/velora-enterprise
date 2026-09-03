import { cancelledByLabel } from "@/lib/cancellation-reasons";
import { formatDate, formatStatus } from "@/lib/format";
import type { Order } from "@/lib/types";

export function CancellationInfo({ order }: { order: Order }) {
  if (order.status === "cancellation_requested") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
        <h3 className="font-heading font-semibold text-amber-900 dark:text-amber-100">
          Cancellation requested — pending admin approval
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Your reason</dt>
            <dd>{order.cancellation_reason ?? "—"}</dd>
          </div>
          {order.cancellation_requested_at && (
            <div>
              <dt className="text-muted-foreground">Requested on</dt>
              <dd>{formatDate(order.cancellation_requested_at)}</dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  if (order.cancellation_decision === "rejected") {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading font-semibold">Cancellation request rejected</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Your reason</dt>
            <dd>{order.cancellation_reason ?? "—"}</dd>
          </div>
          {order.cancellation_admin_note && (
            <div>
              <dt className="text-muted-foreground">Admin response</dt>
              <dd>{order.cancellation_admin_note}</dd>
            </div>
          )}
          {order.cancellation_reviewed_at && (
            <div>
              <dt className="text-muted-foreground">Reviewed on</dt>
              <dd>{formatDate(order.cancellation_reviewed_at)}</dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  if (order.status !== "cancelled") return null;

  const cancelledBy = cancelledByLabel(order.cancelled_by_role);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
      <h3 className="font-heading font-semibold text-red-900 dark:text-red-100">Status: Cancelled</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Cancelled By</dt>
          <dd className="font-medium">{cancelledBy}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cancellation Reason</dt>
          <dd>{order.cancellation_reason}</dd>
        </div>
        {order.cancellation_admin_note && (
          <div>
            <dt className="text-muted-foreground">Admin note</dt>
            <dd>{order.cancellation_admin_note}</dd>
          </div>
        )}
        {order.cancelled_at && (
          <div>
            <dt className="text-muted-foreground">Cancelled Date &amp; Time</dt>
            <dd>{formatDate(order.cancelled_at)}</dd>
          </div>
        )}
        {order.status_before_cancel && (
          <div>
            <dt className="text-muted-foreground">Previous Status</dt>
            <dd>{formatStatus(order.status_before_cancel)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
