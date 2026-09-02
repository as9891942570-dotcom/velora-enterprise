"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildCancellationReason,
  validateCancellationInput,
  type CancellationReasonOption,
} from "@/lib/cancellation-reasons";

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface CancelOrderDialogProps {
  open: boolean;
  title?: string;
  reasons: readonly CancellationReasonOption[];
  loading?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
}

export function CancelOrderDialog({
  open,
  title = "Cancel Order",
  reasons,
  loading = false,
  onConfirm,
  onCancel,
}: CancelOrderDialogProps) {
  const [selected, setSelected] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleConfirm() {
    const validationError = validateCancellationInput(selected, customReason);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    const reason = buildCancellationReason(selected, customReason);
    await onConfirm(reason);
  }

  function handleClose() {
    setSelected("");
    setCustomReason("");
    setError("");
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please select a reason for cancelling this order. This will be recorded permanently.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Cancellation reason</label>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setError("");
            }}
            className={inputClass}
          >
            <option value="">Select a reason...</option>
            {reasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>

          {selected === "Other" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Custom reason</label>
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError("");
                }}
                rows={3}
                placeholder="Please describe why you are cancelling..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Go Back
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
