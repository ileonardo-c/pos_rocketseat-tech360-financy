import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type TextLinkState = "default" | "hover";

type TextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  state?: TextLinkState;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

export const TextLink = ({
  className,
  state = "default",
  leftIcon,
  rightIcon,
  children,
  ...anchorProps
}: TextLinkProps) => {
  return (
    <a
      className={cx(
        // Figma: text #1F6F43 Medium 14px, gap-4px
        "inline-flex items-center gap-1 text-sm font-medium text-[#1f6f43] transition-colors duration-150 hover:border-b hover:border-[#1f6f43]",
        state === "hover" ? "border-b border-[#1f6f43]" : "",
        className,
      )}
      {...anchorProps}
    >
      {leftIcon && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          {leftIcon}
        </span>
      )}
      <span>{children}</span>
      {rightIcon && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          {rightIcon}
        </span>
      )}
    </a>
  );
};
