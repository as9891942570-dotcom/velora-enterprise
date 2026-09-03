/** Customer statuses eligible to REQUEST cancellation — matches backend CUSTOMER_CANCELLABLE. */
export const CUSTOMER_CANCELLABLE_STATUSES = ["pending", "confirmed"] as const;

export function canCustomerCancelOrder(
  status: string,
  isAuthenticated: boolean,
): boolean {
  return (
    isAuthenticated &&
    CUSTOMER_CANCELLABLE_STATUSES.includes(status as (typeof CUSTOMER_CANCELLABLE_STATUSES)[number])
  );
}
