import { Card } from "@/components/ui/card";
import { cx } from "@/lib/utils";
import type { ReactNode } from "react";

type CategoryOverviewCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  iconClassName?: string;
  className?: string;
};

export const CategoryOverviewCard = ({
  label,
  value,
  icon,
  iconClassName,
  className,
}: CategoryOverviewCardProps) => {
  return (
    <Card className={cx("rounded-xl border-financy-border bg-financy-surface p-[25px]", className)}>
      <div className="flex items-start gap-4">
        <div
          className={cx(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center text-financy-text-secondary",
            iconClassName,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[28px] font-bold leading-8 text-financy-heading">{value}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.6px] text-financy-muted">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
};
