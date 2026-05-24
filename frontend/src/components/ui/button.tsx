import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Visual state override (for style-guide / storybook). Real hover/disabled is via CSS. */
  state?: "default" | "hover" | "disabled";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,opacity,box-shadow,outline-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/60 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  // Figma: Solid — bg #1F6F43 hover #124B2B, text white
  primary:
    "bg-financy-primary text-white hover:bg-financy-primary-hover active:bg-financy-primary-press shadow-sm",
  // Figma: Outline — bg surface border field-border, hover bg surface-hover
  outline:
    "bg-financy-surface text-financy-text-secondary border border-financy-field-border hover:bg-financy-surface-hover",
  danger: "bg-financy-danger text-white hover:opacity-90 active:opacity-80",
  ghost:
    "bg-transparent text-financy-primary hover:text-financy-primary-hover hover:bg-financy-surface-soft",
};

// Figma: Md = h-48px px-16px text-16px, Sm = h-36px px-12px text-14px
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm", // 36px / 14px
  md: "h-12 px-4 text-base", // 48px / 16px
  lg: "h-14 px-6 text-base",
};

const forcedHover: Record<ButtonVariant, string> = {
  primary: "bg-financy-primary-hover",
  outline: "bg-financy-surface-hover",
  danger: "opacity-90",
  ghost: "text-financy-primary-hover bg-financy-surface-soft",
};

export const Button = ({
  className,
  variant = "primary",
  size = "md",
  state = "default",
  startIcon,
  endIcon,
  disabled,
  children,
  ...buttonProps
}: ButtonProps) => {
  const isDisabled = disabled || state === "disabled";
  const stateClass =
    state === "hover"
      ? forcedHover[variant]
      : state === "disabled"
        ? "opacity-50 pointer-events-none"
        : "";

  return (
    <button
      className={cx(base, variants[variant], sizes[size], stateClass, className)}
      type="button"
      disabled={isDisabled}
      {...buttonProps}
    >
      {startIcon && (
        <span className="inline-flex shrink-0 items-center justify-center">{startIcon}</span>
      )}
      {children}
      {endIcon && (
        <span className="inline-flex shrink-0 items-center justify-center">{endIcon}</span>
      )}
    </button>
  );
};
