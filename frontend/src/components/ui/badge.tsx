import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type BadgeVariant =
  | "neutral"
  | "income"
  | "expense"
  | "gray"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "bg-[#e5e7eb] text-[#374151]",
  income: "bg-[#e0fae9] text-[#15803d]",
  expense: "bg-[#fee2e2] text-[#b91c1c]",
  gray: "bg-[#e5e7eb] text-[#374151]",
  blue: "bg-[#dbeafe] text-[#1d4ed8]",
  purple: "bg-[#f3e8ff] text-[#7e22ce]",
  pink: "bg-[#fce7f3] text-[#be185d]",
  red: "bg-[#fee2e2] text-[#b91c1c]",
  orange: "bg-[#ffedd5] text-[#c2410c]",
  yellow: "bg-[#f7f3ca] text-[#a16207]",
  green: "bg-[#e0fae9] text-[#15803d]",
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
