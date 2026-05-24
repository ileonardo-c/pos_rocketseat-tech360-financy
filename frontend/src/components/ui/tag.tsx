import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type TagCategory = "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  category?: TagCategory;
  children: ReactNode;
  /** Makes the tag interactive (adds cursor-pointer) */
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
};

// Uses @theme tokens from index.css — bg-financy-tag-{cat}-{bg|text}
const categoryClasses: Record<TagCategory, string> = {
  gray: "bg-financy-tag-gray-bg   text-financy-tag-gray-text",
  blue: "bg-financy-tag-blue-bg   text-financy-tag-blue-text",
  purple: "bg-financy-tag-purple-bg text-financy-tag-purple-text",
  pink: "bg-financy-tag-pink-bg   text-financy-tag-pink-text",
  red: "bg-financy-tag-red-bg    text-financy-tag-red-text",
  orange: "bg-financy-tag-orange-bg text-financy-tag-orange-text",
  yellow: "bg-financy-tag-yellow-bg text-financy-tag-yellow-text",
  green: "bg-financy-tag-green-bg  text-financy-tag-green-text",
};

export const Tag = ({ className, category = "gray", onClick, children, ...tagProps }: TagProps) => {
  return (
    <span
      className={cx(
        // Figma: rounded-[999px] px-12 py-4 text-14px font-medium
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium",
        categoryClasses[category],
        onClick ? "cursor-pointer" : "",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick(e as never);
            }
          : undefined
      }
      {...tagProps}
    >
      {children}
    </span>
  );
};
