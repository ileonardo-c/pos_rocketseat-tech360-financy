import type { InputHTMLAttributes } from "react";

import { cx } from "@/lib/utils";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: "text" | "email" | "password" | "number" | "date" | "search";
};

export const Input = ({ className, type = "text", ...props }: InputProps) => {
  return (
    <input
      className={cx(
        "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100",
        className,
      )}
      type={type}
      {...props}
    />
  );
};
