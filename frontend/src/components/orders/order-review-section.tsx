"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ProductReview, ReviewEligibility } from "@/lib/types";

export function OrderReviewSection({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const { isAuthenticated } = useAuth();
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isAuthenticated || orderStatus !== "delivered") return;
    apiFetch<ReviewEligibility>(`/reviews/eligibility/${orderId}`, { auth: true })
      .then(setEligibility)
      .catch(() => setEligibility(null));
  }, [isAuthenticated, orderId, orderStatus]);

  if (!isAuthenticated || orderStatus !== "delivered" || !eligibility) return null;

  const reviewable = eligibility.items.filter((item) => item.eligible);
  if (reviewable.length === 0 && !success) return null;

  async function submit(productId: string) {
    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5");
      return;
    }
    if (comment.trim().length < 5) {
      setError("Please write at least 5 characters of feedback");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch<ProductReview>("/reviews", {
        method: "POST",
        body: { order_id: orderId, product_id: productId, rating, comment: comment.trim() },
        auth: true,
      });
      setSuccess("Thank you — your review was submitted.");
      setOpenProductId(null);
      setComment("");
      const next = await apiFetch<ReviewEligibility>(`/reviews/eligibility/${orderId}`, { auth: true });
      setEligibility(next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-heading font-semibold">Write a Review</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This order was delivered. Share your feedback on the products you received.
      </p>
      {success && <p className="mt-2 text-sm text-green-700 dark:text-green-300">{success}</p>}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <ul className="mt-4 space-y-3">
        {reviewable.map((item) => (
          <li key={item.product_id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.product_name}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpenProductId(openProductId === item.product_id ? null : item.product_id);
                  setError("");
                }}
              >
                ⭐ Write a Review
              </Button>
            </div>
            {openProductId === item.product_id && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`text-2xl ${star <= rating ? "text-amber-500" : "text-muted-foreground"}`}
                      onClick={() => setRating(star)}
                      aria-label={`${star} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="How was this product?"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <Button onClick={() => submit(item.product_id)} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
