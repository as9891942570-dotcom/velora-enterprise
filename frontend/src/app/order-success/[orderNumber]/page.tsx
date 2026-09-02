import { Suspense, use } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";

import OrderSuccessContent from "./order-success-content";

export default function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OrderSuccessContent orderNumber={orderNumber} />
    </Suspense>
  );
}
