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
  const isChecked = checked || state === "checked";

  return (
    <label
      className={cx(
        "inline-flex items-center gap-2 text-sm text-financy-text",
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input
        aria-checked={isChecked}
        checked={checked}
        disabled={isDisabled}
        type="checkbox"
        onChange={onChange}
        {...inputProps}
        className={cx(
          "size-4 rounded-sm border border-financy-field-border bg-financy-surface text-financy-primary accent-financy-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/25",
          isDisabled && "cursor-not-allowed",
        )}
      />
      {label}
    </label>
  );
};
