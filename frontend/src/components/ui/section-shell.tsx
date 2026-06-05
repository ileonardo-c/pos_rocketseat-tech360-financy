import type { ReactNode } from "react";

import { IconChevronRight } from "@/assets/icons";
import { Card } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { cx } from "@/lib/utils";
import { Link } from "react-router-dom";

type SectionShellProps = {
  title: string;
  dataTestId?: string;
  linkLabel?: string;
  linkTo?: string;
  footerLabel?: string;
  footerTo?: string;
  footerOnClick?: () => void;
  footerIcon?: ReactNode;
  bodyElement?: "div" | "ul";
  bodySpacing?: "none" | "compact" | "comfortable";
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export const SectionShell = ({
  title,
  dataTestId,
  linkLabel,
  linkTo,
  footerLabel,
  footerTo,
  footerOnClick,
  footerIcon,
  bodyElement = "div",
  bodySpacing = "none",
  className,
  bodyClassName,
  children,
}: SectionShellProps) => {
  const BodyElement = bodyElement;
  const bodySpacingClass =
    bodySpacing === "comfortable"
      ? "px-6 py-6"
      : bodySpacing === "compact"
        ? "px-4 py-4 sm:px-6 sm:py-5"
        : "";

  return (
    <Card
      className={cx("overflow-hidden border-financy-border bg-financy-surface p-0", className)}
      data-testid={dataTestId}
    >
      <header className="flex h-[61px] items-center justify-between border-b border-financy-border px-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.6px] text-financy-muted">
          {title}
        </h2>
        {linkLabel && linkTo ? (
          <TextLink
            asChild
            rightIcon={<IconChevronRight className="h-[11px] w-[7px]" />}
            variant="dashboard"
          >
            <Link to={linkTo}>{linkLabel}</Link>
          </TextLink>
        ) : null}
      </header>

      <BodyElement
        className={cx(
          bodyElement === "ul" ? "m-0 list-none p-0" : "",
          bodySpacingClass,
          bodyClassName,
        )}
      >
        {children}
      </BodyElement>

      {footerLabel && (footerTo || footerOnClick) ? (
        <footer className="flex h-[60px] border-t border-financy-border">
          {footerTo ? (
            <Link
              to={footerTo}
              className="flex h-full w-full cursor-pointer items-center justify-center px-6 transition-colors hover:bg-financy-surface-hover"
            >
              <TextLink asChild leftIcon={footerIcon} variant="dashboard">
                <span>{footerLabel}</span>
              </TextLink>
            </Link>
          ) : (
            <button
              type="button"
              onClick={footerOnClick}
              className="flex h-full w-full cursor-pointer items-center justify-center px-6 transition-colors hover:bg-financy-surface-hover"
            >
              <TextLink asChild leftIcon={footerIcon} variant="dashboard">
                <span>{footerLabel}</span>
              </TextLink>
            </button>
          )}
        </footer>
      ) : null}
    </Card>
  );
};
