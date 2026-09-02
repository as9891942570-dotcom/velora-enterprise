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

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>Last updated: September 2026</p>
      <p>
        By accessing and using the Velora Enterprise website, you agree to these Terms of Service.
        Please read them carefully before making a purchase.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Products & Pricing</h2>
      <p>
        All prices are listed in Indian Rupees (INR) and include applicable taxes unless stated
        otherwise. We reserve the right to modify prices and product availability without prior notice.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Orders</h2>
      <p>
        Placing an order constitutes an offer to purchase. We reserve the right to accept or decline
        any order. Order confirmation does not guarantee acceptance until shipped.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Intellectual Property</h2>
      <p>
        All content on this website, including images, text, and logos, is the property of Velora
        Enterprise and may not be reproduced without permission.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Limitation of Liability</h2>
      <p>
        Velora Enterprise shall not be liable for any indirect, incidental, or consequential damages
        arising from the use of our products or services.
      </p>
    </LegalLayout>
  );
}
