import type { AnchorHTMLAttributes, ReactElement, ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";

import { cx } from "@/lib/utils";

type TextLinkState = "default" | "hover";

type TextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  state?: TextLinkState;
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
};

export const TextLink = ({
  className,
  asChild = false,
  state = "default",
  leftIcon,
  rightIcon,
  children,
  ...anchorProps
}: TextLinkProps) => {
  const mergedClassName = cx(
    "inline-flex items-center gap-1 text-sm font-medium text-[#1f6f43] transition-colors duration-150 hover:border-b hover:border-[#1f6f43]",
    state === "hover" ? "border-b border-[#1f6f43]" : "",
    className,
  );

  if (asChild) {
    const child = Children.only(children) as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>;
    if (!isValidElement(child)) {
      return null;
    }
    const content = (
      <>
        {leftIcon && (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
            {leftIcon}
          </span>
        )}
        <span>{child.props.children}</span>
        {rightIcon && (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
            {rightIcon}
          </span>
        )}
      </>
    );

    return cloneElement(child, {
      ...anchorProps,
      className: cx(mergedClassName, child.props.className),
      children: content,
    });
  }

  const content = (
    <>
      {leftIcon && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          {rightIcon}
        </span>
      )}
    </>
  );

  return (
    <a className={mergedClassName} {...anchorProps}>
      {content}
    </a>
  );
};
