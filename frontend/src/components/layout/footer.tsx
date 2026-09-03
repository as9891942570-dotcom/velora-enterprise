import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone, Clock } from "lucide-react";

import {
  BUSINESS_NAME,
  COMPANY_CITY,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  WORKING_HOURS,
  getWhatsAppUrl,
} from "@/lib/config";

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
  const whatsappUrl = getWhatsAppUrl("Hello Velora Enterprise, I need help.");

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
            <p className="text-sm font-semibold text-foreground">Contact</p>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <Phone className="size-3.5" />
                  {SUPPORT_PHONE}
                </a>
              </li>
              {whatsappUrl && (
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    <MessageCircle className="size-3.5 text-[#25D366]" />
                    WhatsApp
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 break-all hover:text-foreground"
                >
                  <Mail className="size-3.5" />
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="size-3.5" />
                {COMPANY_CITY}
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock className="size-3.5" />
                {WORKING_HOURS}
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
