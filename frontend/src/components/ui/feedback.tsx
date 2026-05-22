import type { ReactNode } from "react";

import { cx } from "@/lib/utils";

type ErrorBannerProps = {
  message?: string | null;
  className?: string;
};

export const ErrorBanner = ({ message, className }: ErrorBannerProps) => {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cx(
        "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
        className,
      )}
    >
      {message}
    </p>
  );
};

export const SuccessBanner = ({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) => {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cx(
        "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700",
        className,
      )}
    >
      {message}
    </p>
  );
};
