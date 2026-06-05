import { Tag } from "@/components/ui/tag";

type CategoryRowProps = {
  label: string;
  itemsLabel: string;
  totalLabel: string;
  variant: "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";
};

export const CategoryRow = ({ label, itemsLabel, totalLabel, variant }: CategoryRowProps) => {
  return (
    <li className="-mx-6 relative flex min-h-10 w-[calc(100%+48px)] items-center px-6 before:pointer-events-none before:absolute before:-inset-x-0 before:-top-2.5 before:-bottom-2.5 before:z-0 before:bg-financy-surface-soft/60 before:opacity-0 before:transition-opacity before:duration-200 before:ease-out hover:before:opacity-100 motion-reduce:before:transition-none">
      <Tag category={variant} className="relative z-10">
        {label}
      </Tag>
      <p className="relative z-10 ml-auto min-w-[68px] text-right text-sm text-financy-muted">
        {itemsLabel}
      </p>
      <p className="relative z-10 ml-6 min-w-[102px] text-right text-sm font-semibold text-financy-text">
        {totalLabel}
      </p>
    </li>
  );
};
