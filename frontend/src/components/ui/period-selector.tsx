import { IconChevronDown } from "@/assets/icons";
import {
  clearManagedTimeout,
  scheduleManagedTimeout,
  useTimeoutCleanup,
} from "@/lib/hooks/use-timeout-cleanup";
import { cx } from "@/lib/utils";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export type PeriodValue = {
  month: number;
  year: number;
};

type PeriodSelectorState = "default" | "hover" | "focus" | "open" | "disabled";

type PeriodSelectorProps = {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  disabled?: boolean;
  state?: PeriodSelectorState;
  id?: string;
  minYear?: number;
  maxYear?: number;
  "data-testid"?: string;
};

type DropdownState = "closed" | "open" | "closing";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatPeriodLabel = (value: PeriodValue) => {
  const normalizedMonth = Math.min(12, Math.max(1, value.month));
  const monthLabel = toTitleCase(
    monthFormatter.format(new Date(value.year, normalizedMonth - 1, 1)),
  );
  return `${monthLabel} / ${value.year}`;
};

const getCloseDurationMs = () => {
  if (typeof window === "undefined") {
    return 150;
  }

  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--dropdown-close-dur");
  const parsed = Number.parseInt(raw, 10);

  return Number.isNaN(parsed) ? 150 : parsed;
};

const buildYears = (year: number, minYear?: number, maxYear?: number) => {
  const safeMin = minYear ?? year - 5;
  const safeMax = maxYear ?? year + 5;
  const values: number[] = [];

  for (let value = safeMax; value >= safeMin; value -= 1) {
    values.push(value);
  }

  return values;
};

const months = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  const label = toTitleCase(monthFormatter.format(new Date(2026, index, 1)));
  return { month, label };
});

let activePeriodScrollLocks = 0;
let lockedBodyOverflow = "";
let lockedBodyPaddingRight = "";
let lockedBodyTouchAction = "";
let lockedBodyOverscrollBehavior = "";

const lockGlobalScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (activePeriodScrollLocks === 0) {
    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    lockedBodyOverflow = body.style.overflow;
    lockedBodyPaddingRight = body.style.paddingRight;
    lockedBodyTouchAction = body.style.touchAction;
    lockedBodyOverscrollBehavior = body.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activePeriodScrollLocks += 1;
};

const unlockGlobalScroll = () => {
  if (typeof document === "undefined") {
    return;
  }

  activePeriodScrollLocks = Math.max(0, activePeriodScrollLocks - 1);

  if (activePeriodScrollLocks === 0) {
    const body = document.body;

    body.style.overflow = lockedBodyOverflow;
    body.style.paddingRight = lockedBodyPaddingRight;
    body.style.touchAction = lockedBodyTouchAction;
    body.style.overscrollBehavior = lockedBodyOverscrollBehavior;
  }
};

export const PeriodSelector = ({
  value,
  onChange,
  disabled = false,
  state = "default",
  id,
  minYear,
  maxYear,
  "data-testid": dataTestId,
}: PeriodSelectorProps) => {
  const [dropdownState, setDropdownState] = useState<DropdownState>("closed");
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const scrollLockActiveRef = useRef(false);
  const monthOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const yearOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const isDisabled = disabled || state === "disabled";
  const isForcedOpen = state === "open";
  const isExpanded = isForcedOpen || dropdownState !== "closed";
  const isOpen = isForcedOpen || dropdownState === "open";
  const generatedSelectorId = useId();
  const selectorId = id ?? generatedSelectorId;
  const triggerId = `${selectorId}-trigger`;
  const dropdownId = `${selectorId}-dropdown`;
  const monthLabelId = `${selectorId}-months-label`;
  const yearLabelId = `${selectorId}-years-label`;
  useTimeoutCleanup(closeTimeoutRef);

  const years = useMemo(
    () => buildYears(value.year, minYear, maxYear),
    [maxYear, minYear, value.year],
  );

  const closeMenu = () => {
    if (isForcedOpen || dropdownState === "closed" || dropdownState === "closing") {
      return;
    }

    setDropdownState("closing");

    scheduleManagedTimeout(
      closeTimeoutRef,
      () => {
        setDropdownState("closed");
      },
      getCloseDurationMs(),
    );
  };

  const openMenu = () => {
    if (isForcedOpen || isDisabled) {
      return;
    }

    clearManagedTimeout(closeTimeoutRef);

    setDropdownState("open");
  };

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (isForcedOpen) {
        return;
      }

      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [isForcedOpen, dropdownState]);

  useEffect(() => {
    const shouldLockScroll = dropdownState !== "closed" && !isForcedOpen;

    if (!shouldLockScroll) {
      if (scrollLockActiveRef.current) {
        unlockGlobalScroll();
        scrollLockActiveRef.current = false;
      }
      return;
    }

    if (!scrollLockActiveRef.current) {
      lockGlobalScroll();
      scrollLockActiveRef.current = true;
    }

    return () => {
      if (scrollLockActiveRef.current) {
        unlockGlobalScroll();
        scrollLockActiveRef.current = false;
      }
    };
  }, [dropdownState, isForcedOpen]);

  useEffect(() => {
    return () => {
      if (scrollLockActiveRef.current) {
        unlockGlobalScroll();
        scrollLockActiveRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedMonthIndex = months.findIndex((monthOption) => monthOption.month === value.month);
    if (selectedMonthIndex >= 0) {
      monthOptionRefs.current[selectedMonthIndex]?.scrollIntoView({
        block: "nearest",
      });
    }

    const selectedYearIndex = years.findIndex((yearOption) => yearOption === value.year);
    if (selectedYearIndex >= 0) {
      yearOptionRefs.current[selectedYearIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [isOpen, value.month, value.year, years]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        id={triggerId}
        type="button"
        data-testid={dataTestId}
        aria-expanded={isExpanded}
        aria-controls={dropdownId}
        disabled={isDisabled}
        onKeyDown={onTriggerKeyDown}
        onClick={() => {
          if (isDisabled) {
            return;
          }

          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        className={cx(
          "relative inline-flex w-full items-center justify-between gap-3 overflow-clip rounded-lg border border-financy-field-border bg-financy-surface px-[13px] py-[15px] text-left text-base leading-[18px] text-financy-field-text transition-[background-color,border-color,box-shadow,color] duration-150 outline-none",
          "focus-visible:border-financy-primary focus-visible:ring-4 focus-visible:ring-financy-surface-on-primary",
          !isDisabled ? "hover:border-financy-primary/60" : "cursor-not-allowed opacity-50",
          state === "hover" ? "border-financy-primary/60 bg-financy-surface-hover" : "",
          state === "focus" ? "border-financy-primary ring-4 ring-financy-surface-on-primary" : "",
          isOpen ? "border-financy-primary" : "",
        )}
      >
        <span className="min-w-0 flex-1 truncate pr-6">{formatPeriodLabel(value)}</span>
        <span
          className={cx(
            "absolute right-[13px] top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center text-financy-field-placeholder transition-transform duration-150 ease-in-out",
            isOpen ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        >
          <IconChevronDown className="h-[5.333px] w-[9.333px]" />
        </span>
      </button>

      {isExpanded ? (
        <div
          id={dropdownId}
          data-open={isOpen}
          className={cx(
            "t-dropdown absolute left-0 top-full z-[70] mt-2 w-full rounded-lg border border-financy-border bg-financy-surface p-3 shadow-lg shadow-black/15",
            isOpen ? "is-open" : "is-closing",
          )}
          data-origin="top-left"
          aria-label="Seleção de período"
          aria-labelledby={`${monthLabelId} ${yearLabelId}`}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p
                id={monthLabelId}
                className="text-xs font-semibold uppercase tracking-[0.08em] text-financy-muted"
              >
                Mês
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain pr-1">
                {months.map((monthOption) => (
                  <button
                    key={monthOption.month}
                    type="button"
                    aria-selected={value.month === monthOption.month}
                    ref={(node) => {
                      monthOptionRefs.current[monthOption.month - 1] = node;
                    }}
                    className={cx(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      value.month === monthOption.month
                        ? "bg-financy-surface-soft font-semibold text-financy-primary"
                        : "text-financy-text hover:bg-financy-surface-soft/70",
                    )}
                    onClick={() => {
                      onChange({
                        month: monthOption.month,
                        year: value.year,
                      });
                    }}
                  >
                    {monthOption.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p
                id={yearLabelId}
                className="text-xs font-semibold uppercase tracking-[0.08em] text-financy-muted"
              >
                Ano
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain pr-1">
                {years.map((yearOption, yearIndex) => (
                  <button
                    key={yearOption}
                    type="button"
                    aria-selected={value.year === yearOption}
                    ref={(node) => {
                      yearOptionRefs.current[yearIndex] = node;
                    }}
                    className={cx(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      value.year === yearOption
                        ? "bg-financy-surface-soft font-semibold text-financy-primary"
                        : "text-financy-text hover:bg-financy-surface-soft/70",
                    )}
                    onClick={() => {
                      onChange({
                        month: value.month,
                        year: yearOption,
                      });
                    }}
                  >
                    {yearOption}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
