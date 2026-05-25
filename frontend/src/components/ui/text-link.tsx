import type { AnchorHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

import { cx } from "@/lib/utils";

type TextLinkState = "default" | "hover";

type TextLinkBaseProps = {
  className?: string;
  state?: TextLinkState;
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type TextLinkAsChildProps = TextLinkBaseProps & {
  asChild: true;
  children: ReactElement<{ className?: string; children?: ReactNode }>;
};

type TextLinkAnchorProps = TextLinkBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: false;
    children: ReactNode;
  };

type TextLinkProps = TextLinkAsChildProps | TextLinkAnchorProps;

export const TextLink = ({
  asChild = false,
  className,
  state = "default",
  leftIcon,
  rightIcon,
  children,
  ...anchorProps
}: TextLinkProps) => {
  const textLinkChildren = asChild && isValidElement(children) ? children.props.children : children;
  const mergedClassName = cx(
    "inline-flex items-center gap-1 text-sm font-medium text-[#1f6f43] transition-colors duration-150 hover:border-b hover:border-[#1f6f43]",
    state === "hover" ? "border-b border-[#1f6f43]" : "",
    className,
  );

  const content = (
    <>
      {leftIcon && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">{leftIcon}</span>
      )}
      <span>{textLinkChildren}</span>
      {rightIcon && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          {rightIcon}
        </span>
      )}
    </>
  );

  if (asChild) {
    if (!isValidElement(children)) {
      return null;
    }

    const child = children as ReactElement<{ className?: string; children?: ReactNode }>;

    return cloneElement(child, {
      ...anchorProps,
      className: cx(mergedClassName, children.props.className),
      children: content,
    });
  }

  return (
    <a className={mergedClassName} {...anchorProps}>
      {content}
    </a>
  );
};
