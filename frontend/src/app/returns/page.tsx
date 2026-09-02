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

export default function ReturnsPage() {
  return (
    <LegalLayout title="Returns & Refunds">
      <h2 className="font-heading text-lg font-semibold text-foreground">Return Eligibility</h2>
      <p>
        We accept returns within 7 days of delivery for unused items in original packaging. Custom
        or personalised items are not eligible for return.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">How to Return</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Contact us at support@velora.com with your order number</li>
        <li>We will provide a return authorization and shipping instructions</li>
        <li>Pack the item securely in its original packaging</li>
        <li>Ship the item back using the provided label or courier details</li>
      </ol>
      <h2 className="font-heading text-lg font-semibold text-foreground">Refunds</h2>
      <p>
        Refunds are processed within 5–7 business days after we receive and inspect the returned
        item. Refunds are issued to the original payment method. COD orders receive refunds via
        bank transfer.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Damaged Items</h2>
      <p>
        If you receive a damaged or defective item, please contact us within 48 hours with photos.
        We will arrange a replacement or full refund at no extra cost.
      </p>
    </LegalLayout>
  );
}
