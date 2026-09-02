import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="font-heading mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
