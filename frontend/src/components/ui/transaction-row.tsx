import type { ReactNode } from "react";

import { IconCircleArrowDown, IconCircleArrowUp } from "@/assets/icons";
import { Tag } from "@/components/ui/tag";

type TransactionRowProps = {
  title: string;
  date: string;
  categoryLabel: string;
  categoryVariant: "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";
  amountLabel: string;
  type: "INCOME" | "EXPENSE";
  leadingIcon?: ReactNode;
  leadingIconBgClassName?: string;
  actions?: ReactNode;
  variant?: "default" | "table";
};

export const TransactionRow = ({
  title,
  date,
  categoryLabel,
  categoryVariant,
  amountLabel,
  type,
  leadingIcon,
  leadingIconBgClassName,
  actions,
  variant = "default",
}: TransactionRowProps) => {
  const isIncome = type === "INCOME";

  if (variant === "table") {
    return (
      <li className="flex flex-col gap-3 border-b border-financy-border px-4 py-4 transition-colors duration-150 ease-out hover:bg-financy-surface-soft/60 sm:grid sm:h-[72px] sm:grid-cols-[minmax(280px,1fr)_84px_184px_128px_156px_128px] sm:items-center sm:gap-0 sm:p-0 last:border-b-0">
        <div className="flex min-w-0 items-center gap-4 sm:box-border sm:h-full sm:px-[25px]">
          <div
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${leadingIconBgClassName ?? ""}`}
          >
            {leadingIcon ? (
              leadingIcon
            ) : isIncome ? (
              <IconCircleArrowUp className="h-4 w-4 text-financy-success" />
            ) : (
              <IconCircleArrowDown className="h-4 w-4 text-financy-danger" />
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <p className="truncate text-base font-medium leading-6 text-financy-text">{title}</p>
            {/* Hide the date on desktop because it has its own column. */}
            <p className="mt-0.5 text-sm text-financy-muted sm:hidden">{date}</p>
          </div>
        </div>

        <div className="hidden h-full items-center justify-center px-[25px] sm:box-border sm:flex">
          <p className="text-center text-sm text-financy-text">{date}</p>
        </div>

        <div className="hidden h-full items-center justify-center px-[25px] sm:box-border sm:flex">
          <Tag category={categoryVariant}>{categoryLabel}</Tag>
        </div>

        <div className="hidden h-full items-center justify-center gap-2 px-[25px] sm:box-border sm:flex">
          {isIncome ? (
            <>
              <IconCircleArrowUp className="h-4 w-4 text-financy-success" />
              <span className="text-sm font-medium text-financy-success">Entrada</span>
            </>
          ) : (
            <>
              <IconCircleArrowDown className="h-4 w-4 text-financy-danger" />
              <span className="text-sm font-medium text-financy-danger">Saída</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Tag category={categoryVariant}>{categoryLabel}</Tag>
            {isIncome ? (
              <span className="flex items-center gap-1 text-xs font-medium text-financy-success">
                <IconCircleArrowUp className="h-3 w-3" /> Entrada
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-financy-danger">
                <IconCircleArrowDown className="h-3 w-3" /> Saída
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm font-semibold text-financy-text">{amountLabel}</span>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </div>

        <div className="hidden h-full items-center justify-end px-[25px] sm:box-border sm:flex">
          <span className="text-sm font-semibold text-financy-text sm:text-right">
            {amountLabel}
          </span>
        </div>

        {actions && (
          <div className="hidden h-full items-center justify-center gap-2 sm:box-border sm:flex sm:px-[25px]">
            {actions}
          </div>
        )}
      </li>
    );
  }

  // DEFAULT VARIANT (Dashboard)
  return (
    <li
      className={
        "grid min-h-20 grid-cols-1 items-start gap-3 border-b border-financy-border px-4 py-4 transition-[background-color,border-color] duration-150 ease-out hover:bg-financy-surface-soft/60 sm:items-center sm:px-6 last:border-b-0 sm:grid-cols-[1fr_160px_160px]"
      }
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${leadingIconBgClassName ?? ""}`}
        >
          {leadingIcon ? (
            leadingIcon
          ) : isIncome ? (
            <IconCircleArrowUp className="h-4 w-4 text-financy-success" />
          ) : (
            <IconCircleArrowDown className="h-4 w-4 text-financy-danger" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-medium leading-6 text-financy-text">{title}</p>
          <p className="mt-0.5 text-sm text-financy-muted">{date}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:contents">
        <Tag category={categoryVariant} className="justify-self-start sm:justify-self-center">
          {categoryLabel}
        </Tag>

        <div className="flex items-center gap-2 text-sm font-semibold text-financy-text sm:justify-self-end">
          <span>{amountLabel}</span>
          {isIncome ? (
            <IconCircleArrowUp className="h-4 w-4 text-financy-success" />
          ) : (
            <IconCircleArrowDown className="h-4 w-4 text-financy-danger" />
          )}
        </div>
      </div>
    </li>
  );
};
