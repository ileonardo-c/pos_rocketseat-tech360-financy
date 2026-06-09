import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type IconButtonVariant = "outline" | "danger";
type IconButtonState = "default" | "hover" | "disabled";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconButtonVariant;
  /** Visual state override (for style-guide / storybook). Real hover/disabled via CSS. */
  state?: IconButtonState;
  /** Accessible label required when there is no visible text */
  "aria-label"?: string;
  children: ReactNode;
};

// Figma: border field-border, bg surface, hover bg surface-hover, disabled opacity-50
const variantClasses: Record<IconButtonVariant, string> = {
  outline:
    "bg-financy-surface border border-financy-field-border text-financy-text-secondary hover:bg-financy-surface-hover",
  danger:
    "bg-financy-surface border border-financy-field-border text-financy-danger hover:bg-financy-surface-hover",
};

export const IconButton = ({
  className,
  variant = "outline",
  state = "default",
  disabled,
  children,
  ...buttonProps
}: IconButtonProps) => {
  const isDisabled = disabled || state === "disabled";
  const stateClass =
    state === "hover"
      ? "bg-financy-surface-hover"
      : isDisabled
        ? "opacity-50 pointer-events-none"
        : "";

  return (
    <button
      className={cx(
        // Figma: size 32px, rounded-lg, p-8px
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[color,background-color,border-color,opacity,box-shadow] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/60 focus-visible:ring-offset-2",
        variantClasses[variant],
        stateClass,
        className,
      )}
      type="button"
      disabled={isDisabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
};
