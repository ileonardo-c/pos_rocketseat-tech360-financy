import { cx } from "@/lib/utils";
import logoMarkUrl from "@/assets/brand/logo-mark.svg";
import logoWordmarkUrl from "@/assets/brand/logo-wordmark.svg";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export const BrandLogo = ({ className, iconClassName, textClassName }: BrandLogoProps) => {
  return (
    <div className={cx("inline-flex h-8 w-[134px] items-center gap-[11.134px]", className)}>
      <img alt="Financy logo" className={cx("h-8 w-8", iconClassName)} src={logoMarkUrl} />
      <img
        alt="Financy"
        className={cx("h-[18.552px] w-[89.873px]", textClassName)}
        src={logoWordmarkUrl}
      />
    </div>
  );
};
