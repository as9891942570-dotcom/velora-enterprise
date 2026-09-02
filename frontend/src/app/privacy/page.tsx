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

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last updated: September 2026</p>
      <p>
        Velora Enterprise (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy.
        This policy describes how we collect, use, and protect your personal information when you
        use our website and services.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Information We Collect</h2>
      <p>
        We collect information you provide directly, including name, email, phone number, shipping
        address, and payment details when you place an order or create an account.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">How We Use Your Information</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Process and fulfil your orders</li>
        <li>Communicate about your orders and account</li>
        <li>Improve our products and services</li>
        <li>Comply with legal obligations</li>
      </ul>
      <h2 className="font-heading text-lg font-semibold text-foreground">Data Security</h2>
      <p>
        We implement appropriate security measures to protect your personal information. Payment
        processing is handled by secure third-party providers.
      </p>
      <h2 className="font-heading text-lg font-semibold text-foreground">Contact</h2>
      <p>
        For privacy-related questions, contact us at{" "}
        <a href="mailto:privacy@velora.com" className="text-foreground hover:underline">
          privacy@velora.com
        </a>
        .
      </p>
    </LegalLayout>
  );
}
