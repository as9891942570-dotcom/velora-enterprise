import { Suspense } from "react";

import { LoadingSpinner } from "@/components/storefront/loading-spinner";

import LoginPageContent from "./login-content";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginPageContent />
    </Suspense>
  );
}
