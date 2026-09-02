import { Suspense } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";

import ShopPageContent from "./shop-content";

export default function ShopPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ShopPageContent />
    </Suspense>
  );
}
