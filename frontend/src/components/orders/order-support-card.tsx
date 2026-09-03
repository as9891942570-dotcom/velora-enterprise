import { Mail, MessageCircle, Phone } from "lucide-react";

import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
  getOrderHelpWhatsAppUrl,
} from "@/lib/config";

export function OrderSupportCard({ orderNumber }: { orderNumber?: string }) {
  const whatsappUrl = getOrderHelpWhatsAppUrl(orderNumber);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-heading font-semibold">Need help with your order?</h3>
      <ul className="mt-3 space-y-2 text-sm">
        <li>
          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Phone className="size-4 text-muted-foreground" />
            {SUPPORT_PHONE}
          </a>
        </li>
        {whatsappUrl && (
          <li>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <MessageCircle className="size-4 text-[#25D366]" />
              WhatsApp
            </a>
          </li>
        )}
        <li>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 break-all hover:underline"
          >
            <Mail className="size-4 text-muted-foreground" />
            {SUPPORT_EMAIL}
          </a>
        </li>
      </ul>
    </div>
  );
}
