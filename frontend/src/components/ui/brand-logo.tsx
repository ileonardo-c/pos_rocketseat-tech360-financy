import { cx } from "@/lib/utils";

const logoMarkUrl = "https://www.figma.com/api/mcp/asset/50350e79-1018-479b-b37d-d3f26f124bf2";
const logoWordmarkUrl = "https://www.figma.com/api/mcp/asset/b6d01693-db8a-4e96-9039-257db390812a";

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
