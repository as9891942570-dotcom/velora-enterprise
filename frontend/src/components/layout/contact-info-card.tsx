import { MessageCircle, Mail, MapPin, Phone, Clock } from "lucide-react";

import {
  BUSINESS_NAME,
  COMPANY_CITY,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  WORKING_HOURS,
  getWhatsAppUrl,
} from "@/lib/config";
import { cn } from "@/lib/utils";

interface ContactInfoCardProps {
  className?: string;
  title?: string;
  compact?: boolean;
}

export function ContactInfoCard({
  className,
  title = "Contact",
  compact = false,
}: ContactInfoCardProps) {
  const whatsappUrl = getWhatsAppUrl("Hello Velora Enterprise, I need help.");

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <p className="font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
        {title}
      </p>
      {!compact && (
        <p className="mt-1 text-sm text-muted-foreground">{BUSINESS_NAME}</p>
      )}
      <ul className="mt-4 space-y-3 text-sm">
        <li className="flex items-start gap-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <a href={`tel:${SUPPORT_PHONE_TEL}`} className="font-medium hover:underline">
            {SUPPORT_PHONE}
          </a>
        </li>
        {whatsappUrl && (
          <li className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-[#25D366]" />
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              WhatsApp
            </a>
          </li>
        )}
        <li className="flex items-start gap-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </li>
        <li className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{COMPANY_CITY}</span>
        </li>
        <li className="flex items-start gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{WORKING_HOURS}</span>
        </li>
      </ul>
    </div>
  );
}
