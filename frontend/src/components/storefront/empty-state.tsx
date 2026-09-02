import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Button render={<Link href={actionHref} />} className="mt-6" size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
