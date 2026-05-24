import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/utils";

type PaginationButtonState = "default" | "hover" | "active" | "disabled";

type PaginationButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  state?: PaginationButtonState;
  label: string;
};

// Figma: 32x32px rounded-8px, border #D1D5DB
// Active: bg #1F6F43 text-white
// Hover: bg #E5E7EB border #D1D5DB
// Default/Disabled: bg-white border #D1D5DB
const stateClasses: Record<PaginationButtonState, string> = {
  default: "bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#e5e7eb]",
  hover: "bg-[#e5e7eb] border border-[#d1d5db] text-[#374151]",
  active: "bg-[#1f6f43] border border-[#1f6f43] text-white",
  disabled: "bg-white border border-[#d1d5db] text-[#374151] opacity-50 pointer-events-none",
};

export const PaginationButton = ({
  className,
  state = "default",
  label,
  disabled,
  ...buttonProps
}: PaginationButtonProps) => {
  const isDisabled = disabled || state === "disabled";

  return (
    <button
      className={cx(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors duration-150 cursor-pointer",
        stateClasses[state],
        className,
      )}
      type="button"
      disabled={isDisabled}
      {...buttonProps}
    >
      {label}
    </button>
  );
};
