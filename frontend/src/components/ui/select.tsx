import {
  type CSSProperties,
  type ChangeEvent,
  Children,
  type KeyboardEvent,
  type ReactNode,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { IconCheck, IconChevronDown } from "@/assets/icons";
import {
  clearManagedTimeout,
  scheduleManagedTimeout,
  useTimeoutCleanup,
} from "@/lib/hooks/use-timeout-cleanup";
import { cx } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  className?: string;
  labelIcon?: ReactNode;
  optionLeadingIconByValue?: Record<string, ReactNode>;
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
  placement?: "auto" | "top" | "bottom";
  children: ReactNode;
};

type DropdownState = "closed" | "open" | "closing";

const fallbackChevron = <IconChevronDown aria-hidden="true" className="h-[5.333px] w-[9.333px]" />;

const checkIcon = <IconCheck className="h-4 w-4 text-financy-success" />;

let activeSelectScrollLocks = 0;
let lockedBodyOverflow = "";
let lockedBodyPaddingRight = "";
let lockedBodyTouchAction = "";
let lockedBodyOverscrollBehavior = "";

const lockGlobalScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (activeSelectScrollLocks === 0) {
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

  activeSelectScrollLocks += 1;
};

const unlockGlobalScroll = () => {
  if (typeof document === "undefined") {
    return;
  }

  activeSelectScrollLocks = Math.max(0, activeSelectScrollLocks - 1);

  if (activeSelectScrollLocks === 0) {
    const body = document.body;

    body.style.overflow = lockedBodyOverflow;
    body.style.paddingRight = lockedBodyPaddingRight;
    body.style.touchAction = lockedBodyTouchAction;
    body.style.overscrollBehavior = lockedBodyOverscrollBehavior;
  }
};

export const Select = ({
  className,
  children,
  labelIcon,
  optionLeadingIconByValue,
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
  placement = "auto",
}: SelectProps) => {
  const triggerId = useId();

  const options = useMemo<SelectOption[]>(() => {
    return Children.toArray(children)
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dropdownTimeoutRef = useRef<number | null>(null);
  const scrollLockActiveRef = useRef(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>(undefined);
  const [menuOrigin, setMenuOrigin] = useState<"top-left" | "bottom-left">("top-left");
  useTimeoutCleanup(dropdownTimeoutRef);

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

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") {
      return;
    }

    const viewportPadding = 8;
    const edgePadding = 4;
    const verticalGap = 8;
    const minDropdownHeight = 120;
    const minDropdownWidth = 160;
    const rect = trigger.getBoundingClientRect();
    const modalScrollRoot = trigger.closest<HTMLElement>('[data-modal-scroll-root="true"]');
    const modalRect = modalScrollRoot?.getBoundingClientRect();

    const boundaryTop = Math.max(
      viewportPadding,
      (modalRect?.top ?? viewportPadding) + edgePadding,
    );
    const boundaryBottom = Math.min(
      window.innerHeight - viewportPadding,
      (modalRect?.bottom ?? window.innerHeight - viewportPadding) - edgePadding,
    );
    const boundaryLeft = Math.max(
      viewportPadding,
      (modalRect?.left ?? viewportPadding) + edgePadding,
    );
    const boundaryRight = Math.min(
      window.innerWidth - viewportPadding,
      (modalRect?.right ?? window.innerWidth - viewportPadding) - edgePadding,
    );

    const spaceBelow = boundaryBottom - (rect.bottom + verticalGap);
    const spaceAbove = rect.top - verticalGap - boundaryTop;

    let resolvedPlacement: "top" | "bottom" = placement === "auto" ? "bottom" : placement;

    if (placement === "auto") {
      if (spaceBelow < minDropdownHeight && spaceAbove > spaceBelow) {
        resolvedPlacement = "top";
      }
    } else if (
      resolvedPlacement === "bottom" &&
      spaceBelow < minDropdownHeight &&
      spaceAbove > spaceBelow
    ) {
      resolvedPlacement = "top";
    } else if (
      resolvedPlacement === "top" &&
      spaceAbove < minDropdownHeight &&
      spaceBelow > spaceAbove
    ) {
      resolvedPlacement = "bottom";
    }

    const availableHeight = resolvedPlacement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(96, Math.floor(availableHeight));
    const contentHeight = menuRef.current?.scrollHeight ?? maxHeight;
    const measuredHeight = Math.min(contentHeight, maxHeight);

    const width = Math.min(rect.width, Math.max(minDropdownWidth, boundaryRight - boundaryLeft));
    const left = Math.max(boundaryLeft, Math.min(rect.left, boundaryRight - width));
    const top =
      resolvedPlacement === "bottom"
        ? rect.bottom + verticalGap
        : rect.top - verticalGap - measuredHeight;

    setMenuStyle({
      left,
      top,
      width,
      maxHeight,
    });
    setMenuOrigin(resolvedPlacement === "bottom" ? "top-left" : "bottom-left");
  };

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
    setMenuStyle(undefined);
    setMenuOrigin("top-left");

    scheduleManagedTimeout(
      dropdownTimeoutRef,
      () => {
        setDropdownState("closed");
        setHighlightedIndex(-1);
      },
      getCloseDurationMs(),
    );
  };

  const openMenu = () => {
    clearManagedTimeout(dropdownTimeoutRef);

    setDropdownState("open");
    setInitialHighlight();
    updateMenuPosition();
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
      if (
        target &&
        isExpanded &&
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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
  // Handled by useTimeoutCleanup.

  useEffect(() => {
    if (!isExpanded) {
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

    updateMenuPosition();
    const raf = window.requestAnimationFrame(() => {
      updateMenuPosition();
    });

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);

      if (scrollLockActiveRef.current) {
        unlockGlobalScroll();
        scrollLockActiveRef.current = false;
      }
    };
  }, [isExpanded, placement]);

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
        const highlightedOption = highlightedIndex >= 0 ? options[highlightedIndex] : null;
        if (highlightedOption && !highlightedOption.disabled) {
          commitSelection(highlightedOption.value);
        } else {
          closeMenu();
        }
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
        ref={triggerRef}
        className={cx(
          "relative flex w-full items-center justify-between gap-3 overflow-clip rounded-lg border border-financy-field-border bg-financy-surface px-[13px] py-[15px] text-left text-base leading-[18px] text-financy-field-text transition-[background-color,border-color,box-shadow,color] duration-150 disabled:cursor-not-allowed disabled:bg-financy-disabled disabled:text-financy-text-subtle",
          "outline-none focus:border-financy-primary focus-visible:ring-4 focus-visible:ring-financy-surface-on-primary hover:border-financy-primary/60",
          error ? "border-financy-danger ring-4 ring-financy-danger/20" : "",
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
        <span className="flex min-w-0 flex-1 items-center truncate pr-6">{selectedLabel}</span>
        <span
          className={cx(
            "pointer-events-none absolute right-[13px] top-1/2 inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center text-financy-field-placeholder transition-transform duration-150 ease-in-out",
            isOpen ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        >
          {resolvedIcon}
        </span>
      </button>

      {dropdownState !== "closed"
        ? createPortal(
            <ul
              ref={menuRef}
              data-open={isOpen}
              className={cx(
                "t-dropdown fixed z-[70] overflow-y-auto overscroll-contain rounded-lg border border-financy-border bg-financy-surface p-1 shadow-lg shadow-black/15",
                dropdownState === "open" ? "is-open" : "is-closing",
              )}
              style={menuStyle}
              data-origin={menuOrigin}
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
                      <span className="inline-flex min-w-0 items-center gap-2">
                        {optionLeadingIconByValue?.[option.value] ? (
                          <span
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-financy-muted"
                            aria-hidden="true"
                          >
                            {optionLeadingIconByValue[option.value]}
                          </span>
                        ) : null}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {isSelected ? checkIcon : null}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}

      <select
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        name={name}
        value={selectedValue}
        disabled={disabled}
        required={required}
        onChange={() => undefined}
        tabIndex={-1}
      >
        {options.map((option) => (
          <option
            key={`${option.value}-${option.label}`}
            disabled={option.disabled}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
