import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SummaryPanelProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
};

export function SummaryPanel({
  label,
  value,
  hint,
  className,
  valueClassName,
}: SummaryPanelProps) {
  return (
    <div className={cn("app-panel min-w-[8.5rem]", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", valueClassName)}>
        {value}
      </div>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
