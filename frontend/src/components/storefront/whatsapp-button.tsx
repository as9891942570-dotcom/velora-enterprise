import { MessageCircle } from "lucide-react";

import { getWhatsAppUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  className?: string;
  variant?: "inline" | "floating";
  label?: string;
}

export function WhatsAppButton({
  className,
  variant = "inline",
  label = "Chat on WhatsApp",
}: WhatsAppButtonProps) {
  const url = getWhatsAppUrl();
  if (!url) return null;

  if (variant === "floating") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105",
          className,
        )}
      >
        <MessageCircle className="size-7" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <MessageCircle className="size-4 text-[#25D366]" />
      {label}
    </a>
  );
}
