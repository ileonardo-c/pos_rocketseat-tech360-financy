import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type CheckboxState = "default" | "checked" | "disabled";

type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children" | "className" | "onChange"
> & {
  checked?: boolean;
  label?: ReactNode;
  state?: CheckboxState;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  className?: string;
};

export const Checkbox = ({
  checked,
  disabled,
  label,
  state = "default",
  className,
  onChange,
  ...inputProps
}: CheckboxProps) => {
  const isDisabled = disabled || state === "disabled";
  const isChecked = checked ?? state === "checked";

  return (
    <label
      className={cx(
        "inline-flex items-center gap-2 text-sm text-financy-text",
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative inline-flex size-4 items-center justify-center">
        <input
          checked={isChecked}
          disabled={isDisabled}
          type="checkbox"
          onChange={onChange}
          {...inputProps}
          className={cx("peer sr-only", isDisabled && "cursor-not-allowed")}
        />
        <span
          aria-hidden="true"
          className={cx(
            "absolute inset-0 rounded border border-financy-field-border bg-financy-surface transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-financy-primary/25",
            "peer-checked:border-financy-primary peer-checked:bg-financy-primary",
            isDisabled && "opacity-60",
          )}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="t-checkmark pointer-events-none z-10 size-3 scale-75 text-financy-surface opacity-0 transition-[opacity,transform] duration-150 ease-out peer-checked:scale-100 peer-checked:opacity-100 peer-checked:animate-[t-check-pop_220ms_cubic-bezier(0.34,1.45,0.64,1)]"
        >
          <path
            d="M4 8.2L6.8 11 12 5.8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      {label}
    </label>
  );
};
