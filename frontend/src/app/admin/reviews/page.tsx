"use client";

import { useCallback, useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";
import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch, buildQuery, notifyAdminNotificationsChanged } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PaginatedResponse, ProductReview } from "@/lib/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("unread");
  const [rating, setRating] = useState("");
  const [search, setSearch] = useState("");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<ProductReview>>(
      `/admin/reviews${buildQuery({
        page_size: 50,
        is_read: filter === "all" ? undefined : filter === "read",
        rating: rating ? Number(rating) : undefined,
        search: search || undefined,
      })}`,
      { auth: true },
    )
      .then((data) => setReviews(data.items))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [filter, rating, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    try {
      const updated = await apiFetch<ProductReview>(`/admin/reviews/${id}`, {
        method: "PATCH",
        body,
        auth: true,
      });
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setReplyingId(null);
      setReply("");
      notifyAdminNotificationsChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Update failed");
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">Customer product feedback</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="all">All</option>
        </select>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} stars
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer or comment"
          className="h-9 min-w-56 rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {loading ? (
        <LoadingSpinner />
      ) : reviews.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No reviews found.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {review.customer_name} on {review.product_name}
                  </p>
                  <p className="text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  <p className="mt-2 text-sm">{review.comment}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(review.created_at)} · {review.is_read ? "Read" : "Unread"}
                    {review.is_hidden ? " · Hidden" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!review.is_read && (
                    <Button size="sm" variant="outline" onClick={() => patch(review.id, { is_read: true })}>
                      Mark read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingId(review.id);
                      setReply(review.admin_reply ?? "");
                    }}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => patch(review.id, { is_hidden: !review.is_hidden })}
                  >
                    {review.is_hidden ? "Unhide" : "Hide"}
                  </Button>
                </div>
              </div>
              {review.admin_reply && (
                <p className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-sm">
                  Admin reply: {review.admin_reply}
                </p>
              )}
              {replyingId === review.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  />
                  <Button size="sm" onClick={() => patch(review.id, { admin_reply: reply, is_read: true })}>
                    Save reply
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
