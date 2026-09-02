import Link from "next/link";

import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { BUSINESS_NAME, SUPPORT_EMAIL, getWhatsAppUrl } from "@/lib/config";

const shopLinks = [
  { href: "/shop", label: "All Products" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/returns", label: "Returns & Refunds" },
];

export function Footer() {
  const whatsappUrl = getWhatsAppUrl();

  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-heading text-lg font-semibold text-foreground">{BUSINESS_NAME}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Premium home decor — flower pots, lotus aasan, decorative keychains, and handcrafted
              pieces for modern living.
            </p>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
              >
                Chat on WhatsApp
              </a>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Shop</p>
            <ul className="mt-3 space-y-2">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Legal</p>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Support</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Mon–Sat, 10am–6pm IST</li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground">
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
