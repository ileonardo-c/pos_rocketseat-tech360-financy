import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <section className={cx("rounded-xl border bg-white", className)} {...props}>
      {children}
    </section>
  );
};
