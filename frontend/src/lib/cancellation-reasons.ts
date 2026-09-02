export const ADMIN_CANCELLATION_REASONS = [
  "Product out of stock",
  "Product damaged or unavailable",
  "Unable to deliver to the selected location",
  "Incorrect product pricing",
  "Payment verification issue",
  "Duplicate order",
  "Customer requested cancellation",
  "Other",
] as const;

export const CUSTOMER_CANCELLATION_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Changed my mind",
  "Delivery taking too long",
  "Wrong product selected",
  "Other",
] as const;

export type CancellationReasonOption =
  | (typeof ADMIN_CANCELLATION_REASONS)[number]
  | (typeof CUSTOMER_CANCELLATION_REASONS)[number];

export function buildCancellationReason(
  selected: string,
  customReason: string,
): string {
  if (selected === "Other") {
    return customReason.trim();
  }
  return selected;
}

export function validateCancellationInput(
  selected: string,
  customReason: string,
): string | null {
  if (!selected) return "Please select a cancellation reason";
  if (selected === "Other" && !customReason.trim()) {
    return "Please enter a custom cancellation reason";
  }
  return null;
}

export function cancelledByLabel(
  role: "customer" | "admin" | "system" | null | undefined,
): string {
  if (role === "admin") return "Velora Enterprise";
  if (role === "customer") return "Customer";
  if (role === "system") return "System";
  return "Unknown";
}
