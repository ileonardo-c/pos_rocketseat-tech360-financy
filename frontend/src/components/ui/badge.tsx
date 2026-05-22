import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type BadgeVariant = "neutral" | "income" | "expense";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  income: "bg-emerald-100 text-emerald-700",
  expense: "bg-red-100 text-red-700",
};

export const Badge = ({ className, variant = "neutral", children, ...badgeProps }: BadgeProps) => {
  return (
    <span
      {...badgeProps}
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
