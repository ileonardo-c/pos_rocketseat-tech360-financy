import type { HTMLAttributes } from "react";

import { IconCircleArrowDown, IconCircleArrowUp } from "@/assets/icons";
import { cx } from "@/lib/utils";

type TypeVariant = "income" | "expense";

type TypeIndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: TypeVariant;
};

const labels: Record<TypeVariant, string> = {
  income: "Entrada",
  expense: "Saída",
};

const classes: Record<TypeVariant, string> = {
  income: "text-[#15803d]",
  expense: "text-[#b91c1c]",
};

export const TypeIndicator = ({
  className,
  variant = "income",
  ...typeProps
}: TypeIndicatorProps) => {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 text-sm font-medium",
        classes[variant],
        className,
      )}
      {...typeProps}
    >
      {variant === "income" ? (
        <IconCircleArrowUp className="h-4 w-4" />
      ) : (
        <IconCircleArrowDown className="h-4 w-4" />
      )}
      {labels[variant]}
    </span>
  );
};
