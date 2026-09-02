import { Suspense, use } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";

import OrderDetailContent from "./order-detail-content";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OrderDetailContent orderNumber={orderNumber} />
    </Suspense>
  );
}
