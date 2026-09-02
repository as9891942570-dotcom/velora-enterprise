import { FREE_SHIPPING_MIN_ORDER, SHIPPING_FLAT_RATE } from "@/lib/config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Shipping Policy",
  "Delivery areas, shipping charges, and order tracking for Velora Enterprise orders across India.",
  "/shipping",
);

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-foreground">{title}</h1>
      <div className="prose prose-stone mt-8 max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export default function ShippingPage() {
  return (
    <LegalLayout title="Shipping Policy">
      <h2 className="font-heading text-lg font-semibold text-foreground">Delivery Areas</h2>
      <p>
        We ship across India via trusted courier partners. Delivery times vary by location,
        typically 3–7 business days for metro cities and 5–10 business days for other areas.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Shipping Charges</h2>
      <p>
        Free shipping on orders above ₹{FREE_SHIPPING_MIN_ORDER.toLocaleString("en-IN")}. For
        orders below ₹{FREE_SHIPPING_MIN_ORDER.toLocaleString("en-IN")}, a flat shipping fee of ₹
        {SHIPPING_FLAT_RATE.toLocaleString("en-IN")} applies. Shipping charges are calculated at
        checkout based on your order subtotal.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Order Tracking</h2>
      <p>
        Once your order is shipped, you can track its status from your account orders page. You will
        receive order confirmation by email after placing your order.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Delays</h2>
      <p>
        While we strive for timely delivery, delays may occur due to weather, festivals, or courier
        issues. We will keep you informed of any significant delays.
      </p>
    </LegalLayout>
  );
}
