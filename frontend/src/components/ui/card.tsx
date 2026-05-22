import type { ReactNode } from "react";

import { cx } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => {
  return <section className={cx("rounded-xl border bg-white p-4", className)}>{children}</section>;
};
