import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconCheck } from "@/assets/icons";
import { cx } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  className?: string;
  labelIcon?: ReactNode;
  error?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  "aria-label"?: string;
  "data-testid"?: string;
  children: ReactNode;
};

type DropdownState = "closed" | "open" | "closing";

const fallbackChevron = (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const checkIcon = <IconCheck className="h-4 w-4 text-financy-success" />;

export const Select = ({
  className,
  children,
  labelIcon,
  error,
  disabled,
  value,
  defaultValue,
  onChange,
  required,
  name,
  id,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: SelectProps) => {
  const triggerId = useId();

  const options = useMemo<SelectOption[]>(() => {
    return Array.from(children as Iterable<ReactNode>)
      .filter(
        (child): child is React.ReactElement<HTMLOptionElement> =>
          isValidElement(child) && child.type === "option",
      )
      .map((child) => {
        const rawValue = child.props.value ?? child.props.children;
        const optionValue = rawValue === undefined || rawValue === null ? "" : `${rawValue}`;

        return {
          value: optionValue,
          label: `${child.props.children ?? ""}`,
          disabled: Boolean(child.props.disabled),
        };
      });
  }, [children]);

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue === undefined ? (options[0]?.value ?? "") : `${defaultValue}`,
  );
  const [dropdownState, setDropdownState] = useState<DropdownState>("closed");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dropdownTimeoutRef = useRef<number | null>(null);

  const selectedValue = isControlled ? `${value}` : uncontrolledValue;
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const isOpen = dropdownState === "open";
  const isExpanded = isOpen || dropdownState === "closing";

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

  const getFirstEnabledIndex = () => options.findIndex((option) => !option.disabled);

  const setInitialHighlight = () => {
    if (options.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) {
      setHighlightedIndex(selectedIndex);
      return;
    }

    setHighlightedIndex(getFirstEnabledIndex());
  };

  const moveHighlight = (step: 1 | -1) => {
    if (options.length === 0) {
      return;
    }

    let nextIndex = highlightedIndex;
    const length = options.length;

    for (let i = 0; i < length; i += 1) {
      nextIndex = (nextIndex + step + length) % length;
      if (!options[nextIndex]?.disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
  };

  const closeMenu = () => {
    if (dropdownState === "closed" || dropdownState === "closing") {
      return;
    }

    setDropdownState("closing");

    if (dropdownTimeoutRef.current !== null) {
      window.clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }

    dropdownTimeoutRef.current = window.setTimeout(() => {
      setDropdownState("closed");
      setHighlightedIndex(-1);
      dropdownTimeoutRef.current = null;
    }, getCloseDurationMs());
  };

  const openMenu = () => {
    if (dropdownTimeoutRef.current !== null) {
      window.clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }

    setDropdownState("open");
    setInitialHighlight();
  };

  const commitSelection = (nextValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }

    if (onChange) {
      onChange({
        target: {
          value: nextValue,
          name,
        },
      } as ChangeEvent<HTMLSelectElement>);
    }

    closeMenu();
  };

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && isExpanded && rootRef.current && !rootRef.current.contains(target)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      // Note: the close timer is intentionally NOT cleared here.
      // Canceling it on every re-render would abort the closing animation
      // whenever dropdownState transitions from "open" -> "closing".
      // Cleanup on unmount is handled by the dedicated effect below.
    };
  }, [dropdownState, isExpanded]);

  // Cancel any pending close timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current !== null) {
        window.clearTimeout(dropdownTimeoutRef.current);
        dropdownTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const activeIndex = highlightedIndex;
    const node = optionRefs.current[activeIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlightedIndex]);

  const selectedLabel = options.find((option) => option.value === selectedValue)?.label ?? "";
  const resolvedIcon = labelIcon ?? fallbackChevron;

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  const onOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, option: SelectOption) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!option.disabled) {
        commitSelection(option.value);
      }
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        className={cx(
          "relative flex h-11 w-full items-center justify-between rounded-lg border border-financy-border bg-financy-surface px-3 text-left text-sm text-financy-text transition disabled:cursor-not-allowed disabled:bg-financy-disabled disabled:text-financy-text-subtle",
          "outline-none focus:border-financy-primary focus-visible:ring-4 focus-visible:ring-financy-surface-on-primary hover:border-financy-primary/60",
          error ? "border-financy-danger ring-4 ring-financy-danger/20 text-financy-danger" : "",
          disabled ? "cursor-not-allowed" : "",
          className,
        )}
        aria-invalid={error || undefined}
        aria-required={required}
        aria-expanded={isExpanded}
        aria-haspopup="listbox"
        id={id ?? triggerId}
        type="button"
        aria-label={ariaLabel}
        data-testid={dataTestId}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }

          if (isOpen) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="flex flex-1 items-center truncate pr-2">{selectedLabel}</span>
        <span
          className={cx(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-financy-muted transition-transform duration-150 ease-in-out",
            isOpen ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        >
          {resolvedIcon}
        </span>
      </button>

      {dropdownState !== "closed" ? (
        <ul
          data-open={isOpen}
          className={cx(
            "t-dropdown absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-financy-border bg-financy-surface p-1 shadow-lg shadow-black/15",
            dropdownState === "open" ? "is-open" : "is-closing",
          )}
          data-origin="top-left"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isHighlighted = index === highlightedIndex;

            return (
              <li key={`${option.value}-${option.label}`}>
                <button
                  type="button"
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  className={cx(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-financy-text transition-colors",
                    option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                    isHighlighted
                      ? "bg-financy-surface-soft text-financy-text"
                      : "hover:bg-financy-surface-soft/60",
                    isSelected ? "font-semibold" : "",
                  )}
                  aria-current={isSelected ? "true" : undefined}
                  disabled={option.disabled}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseMove={() => setHighlightedIndex(index)}
                  onClick={() => {
                    if (option.disabled) {
                      return;
                    }

                    commitSelection(option.value);
                  }}
                  onKeyDown={(event) => onOptionKeyDown(event, option)}
                >
                  <span>{option.label}</span>
                  {isSelected ? checkIcon : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <input
        type="hidden"
        name={name}
        value={selectedValue}
        readOnly
        disabled={disabled}
        required={required}
      />
    </div>
  );
};
