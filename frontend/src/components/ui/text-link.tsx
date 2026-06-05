import type { AnchorHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

import { cx } from "@/lib/utils";

type TextLinkState = "default" | "hover";
type TextLinkVariant = "default" | "dashboard";

type TextLinkBaseProps = {
  className?: string;
  state?: TextLinkState;
  variant?: TextLinkVariant;
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
  variant = "default",
  leftIcon,
  rightIcon,
  children,
  ...anchorProps
}: TextLinkProps) => {
  const textLinkChildren = asChild && isValidElement(children) ? children.props.children : children;
  const mergedClassName = cx(
    "inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium leading-5 transition-[color,opacity] duration-150 ease-out",
    variant === "dashboard"
      ? "text-financy-primary hover:text-financy-primary-hover"
      : "border-b border-transparent text-financy-primary hover:border-financy-primary hover:text-financy-primary-hover",
    state === "hover"
      ? variant === "dashboard"
        ? "text-financy-primary-hover"
        : "border-financy-primary text-financy-primary-hover"
      : "",
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
