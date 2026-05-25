import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type InputState = "empty" | "active" | "filled" | "error" | "disabled";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "text" | "email" | "password" | "number" | "date" | "search";
  state?: InputState;
  /** Icon rendered at the start of the input (e.g. <IconMail />) */
  startIcon?: ReactNode;
  /** Icon rendered at the end — can be a button, clickable */
  endIcon?: ReactNode;
  label?: string;
  helper?: string;
  /** Helper text colour: used for error messages */
  helperError?: boolean;
};

export const Input = ({
  className,
  type = "text",
  state = "empty",
  startIcon,
  endIcon,
  label,
  helper,
  helperError,
  disabled,
  ...inputProps
}: InputProps) => {
  const isDisabled = disabled || state === "disabled";
  const hasError = state === "error";
  const isActive = state === "active";
  const inputId = inputProps.id;

  // Figma label colours: active → primary, error → field-error, default → text-secondary
  const labelColor = hasError
    ? "text-financy-field-error"
    : isActive
      ? "text-financy-primary"
      : "text-financy-text-secondary";

  // Figma input box: border field-border, active → primary, error → field-error ring
  const fieldClass = cx(
    // base — Figma: px-13 py-15 rounded-8px bg-white border
    "flex w-full items-center gap-3 rounded-lg border bg-financy-surface px-3.5 py-[15px] text-base text-financy-field-text transition-[border-color,box-shadow] duration-150 outline-none",
    startIcon ? "pl-10" : "",
    endIcon ? "pr-10" : "",
    hasError
      ? "border-financy-field-error ring-4 ring-financy-field-error/10"
      : isActive
        ? "border-financy-primary ring-4 ring-financy-primary/10"
        : "border-financy-field-border focus-within:border-financy-primary focus-within:ring-4 focus-within:ring-financy-primary/10",
    isDisabled ? "opacity-50 cursor-not-allowed" : "",
    className,
  );

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className={cx("text-sm font-medium leading-5", labelColor)}>
          {label}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-financy-field-placeholder">
            {startIcon}
          </span>
        )}
        <input
          className={fieldClass}
          type={type}
          disabled={isDisabled}
          aria-invalid={hasError || undefined}
          {...inputProps}
        />
        {endIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-financy-text-secondary">
            {endIcon}
          </span>
        )}
      </div>
      {helper && (
        <span
          className={cx(
            "text-xs leading-4",
            helperError ? "text-financy-field-error" : "text-financy-muted",
          )}
        >
          {helper}
        </span>
      )}
    </div>
  );
};
