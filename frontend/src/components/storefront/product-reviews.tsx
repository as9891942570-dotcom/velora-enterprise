"use client";

import { useEffect, useState } from "react";

import { apiFetch, buildQuery } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PaginatedResponse, ProductReview } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-muted-foreground">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PaginatedResponse<ProductReview>>(
      `/reviews/product/${productId}${buildQuery({ page_size: 20 })}`,
    )
      .then((data) => setReviews(data.items))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return null;
  if (reviews.length === 0) {
    return (
      <div className="mt-10 border-t border-border pt-8">
        <h2 className="font-heading text-lg font-semibold">Customer reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="font-heading text-lg font-semibold">Customer reviews</h2>
      <ul className="mt-4 space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{review.customer_name ?? "Customer"}</p>
              <Stars rating={review.rating} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
            {review.admin_reply && (
              <p className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-sm">
                <span className="font-medium">Velora Enterprise: </span>
                {review.admin_reply}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
