"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function OrderSuccessContent({ orderNumber }: { orderNumber: string }) {
  const searchParams = useSearchParams();
  const pending = searchParams.get("pending") === "true";

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <CheckCircle className="mx-auto size-16 text-green-600" />
      <h1 className="font-heading mt-6 text-3xl font-semibold text-foreground">
        {pending ? "Order Placed" : "Thank You!"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {pending
          ? "Your order has been placed. Complete payment to confirm."
          : "Your order has been placed successfully."}
      </p>
      <p className="mt-4 font-mono text-lg font-semibold text-foreground">
        Order #{orderNumber}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        A confirmation email will be sent to your registered email address.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button render={<Link href={`/orders/${orderNumber}`} />}>
          View Order
        </Button>
        <Button render={<Link href="/shop" />} variant="outline">
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}
