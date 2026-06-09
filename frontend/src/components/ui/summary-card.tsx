import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cx } from "@/lib/utils";

type SummaryCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  className?: string;
};

export const SummaryCard = ({ label, value, icon, className }: SummaryCardProps) => {
  return (
    <Card className={cx("border-financy-border bg-financy-surface p-6", className)}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
        <p className="text-xs font-medium uppercase tracking-[0.6px] text-financy-muted">{label}</p>
      </div>
      <p className="mt-4 text-[28px] font-bold leading-8 text-financy-text">{value}</p>
    </Card>
  );
};
