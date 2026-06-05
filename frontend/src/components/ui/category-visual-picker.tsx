import { IconCheck } from "@/assets/icons";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useLayoutEffect, useRef } from "react";

export const CATEGORY_ICON_OPTIONS = [
  "briefcase-business",
  "car-front",
  "heart-pulse",
  "piggy-bank",
  "shopping-cart",
  "ticket",
  "tool-case",
  "utensils",
  "paw-print",
  "house",
  "gift",
  "dumbbell",
  "book-open",
  "baggage-claim",
  "mailbox",
  "receipt-text",
  "tag",
  "arrow-up-down",
] as const;

export const CATEGORY_COLOR_OPTIONS = [
  { key: "green", className: "bg-[#16A34A]" },
  { key: "blue", className: "bg-[#2563EB]" },
  { key: "purple", className: "bg-[#9333EA]" },
  { key: "pink", className: "bg-[#DB2777]" },
  { key: "red", className: "bg-[#DC2626]" },
  { key: "orange", className: "bg-[#EA580C]" },
  { key: "yellow", className: "bg-[#CA8A04]" },
] as const;

export type CategoryIconOption = (typeof CATEGORY_ICON_OPTIONS)[number];
export type CategoryColorOption = (typeof CATEGORY_COLOR_OPTIONS)[number]["key"];

const CATEGORY_COLOR_SELECTION_STYLES: Record<
  CategoryColorOption,
  { borderClass: string; bgClass: string; textClass: string }
> = {
  green: {
    borderClass: "border-[#16A34A]",
    bgClass: "bg-financy-tag-green-bg",
    textClass: "text-financy-tag-green-text",
  },
  blue: {
    borderClass: "border-[#2563EB]",
    bgClass: "bg-financy-tag-blue-bg",
    textClass: "text-financy-tag-blue-text",
  },
  purple: {
    borderClass: "border-[#9333EA]",
    bgClass: "bg-financy-tag-purple-bg",
    textClass: "text-financy-tag-purple-text",
  },
  pink: {
    borderClass: "border-[#DB2777]",
    bgClass: "bg-financy-tag-pink-bg",
    textClass: "text-financy-tag-pink-text",
  },
  red: {
    borderClass: "border-[#DC2626]",
    bgClass: "bg-financy-tag-red-bg",
    textClass: "text-financy-tag-red-text",
  },
  orange: {
    borderClass: "border-[#EA580C]",
    bgClass: "bg-financy-tag-orange-bg",
    textClass: "text-financy-tag-orange-text",
  },
  yellow: {
    borderClass: "border-[#CA8A04]",
    bgClass: "bg-financy-tag-yellow-bg",
    textClass: "text-financy-tag-yellow-text",
  },
};

type CategoryVisualPickerProps = {
  selectedIcon: CategoryIconOption;
  selectedColor: CategoryColorOption;
  onIconChange: (next: CategoryIconOption) => void;
  onColorChange: (next: CategoryColorOption) => void;
  disabled?: boolean;
  mode: "create" | "edit";
};

export const CategoryVisualPicker = ({
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
  disabled = false,
  mode,
}: CategoryVisualPickerProps) => {
  const selectedColorStyle = CATEGORY_COLOR_SELECTION_STYLES[selectedColor];
  const iconScrollerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!iconScrollerRef.current) return;
    iconScrollerRef.current.scrollTop = 0;
  }, [mode]);

  return (
    <>
      <div className="flex flex-col gap-2" data-testid={`categories-${mode}-icon-group`}>
        <span className="text-sm font-medium leading-5 text-financy-text-secondary">Ícone</span>
        <div className="max-h-[142px] overflow-hidden sm:max-h-[92px]">
          <div
            ref={iconScrollerRef}
            className="sg-scrollbar-hidden mr-[-14px] max-h-[142px] overflow-y-auto overflow-x-hidden pr-[14px] touch-pan-y overscroll-contain [-webkit-overflow-scrolling:touch] sm:max-h-[92px]"
          >
            <div className="grid w-full max-w-[392px] grid-cols-[repeat(auto-fit,minmax(42px,42px))] justify-between gap-2">
              {CATEGORY_ICON_OPTIONS.map((icon) => {
                const isActive = selectedIcon === icon;
                return (
                  <button
                    key={icon}
                    type="button"
                    disabled={disabled}
                    onClick={() => onIconChange(icon)}
                    data-testid={`categories-${mode}-icon-${icon}`}
                    className={`inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border p-[11px] text-financy-muted transition-[color,border-color,background-color,transform] duration-150 ${
                      isActive
                        ? `${selectedColorStyle.borderClass} ${selectedColorStyle.bgClass} ${selectedColorStyle.textClass}`
                        : "border-financy-field-border bg-financy-surface hover:bg-financy-surface-hover"
                    } focus:outline-none focus:ring-2 focus:ring-financy-primary/35 focus:ring-offset-0 ${disabled ? "pointer-events-none opacity-60" : ""}`}
                    aria-pressed={isActive}
                    aria-label={`Selecionar ícone ${icon}`}
                  >
                    <CategoryIcon icon={icon} className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2" data-testid={`categories-${mode}-color-group`}>
        <span className="text-sm font-medium leading-5 text-financy-text-secondary">Cor</span>
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-2">
          {CATEGORY_COLOR_OPTIONS.map((color) => {
            const isActive = selectedColor === color.key;
            const activeBorderClass = isActive
              ? `${selectedColorStyle.borderClass} bg-[#F8F9FA] shadow-[0_0_0_2px_rgba(31,111,67,0.12)]`
              : "border border-financy-field-border bg-financy-surface";
            return (
              <button
                key={color.key}
                type="button"
                disabled={disabled}
                onClick={() => onColorChange(color.key)}
                data-testid={`categories-${mode}-color-${color.key}`}
                className={`group relative inline-flex h-9 items-center justify-center rounded-lg border p-[5px] transition-[border-color,background-color,transform,box-shadow] duration-150 sm:h-[30px] ${
                  activeBorderClass
                } ${
                  isActive ? "scale-[1.01]" : "hover:bg-financy-surface-hover active:scale-[0.99]"
                } focus:outline-none focus:ring-2 focus:ring-financy-primary/35 focus:ring-offset-0 ${disabled ? "pointer-events-none opacity-60" : ""}`}
                aria-pressed={isActive}
                aria-label={`Selecionar cor ${color.key}`}
              >
                <span className={`h-5 w-full rounded-[4px] ${color.className}`} />
                {isActive ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/15 text-white">
                      <IconCheck className="h-2.5 w-2.5" />
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
