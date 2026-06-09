import { IconSquarePen, IconTrash } from "@/assets/icons";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { IconButton } from "@/components/ui/icon-button";
import { Tag } from "@/components/ui/tag";
import { cx } from "@/lib/utils";

type TagCategory = "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";

type CategoryTileCardProps = {
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  iconContainerClassName: string;
  iconClassName: string;
  tagCategory: TagCategory;
  itemsCount: number;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
  className?: string;
};

const toItemsLabel = (count: number) => {
  if (count === 1) {
    return "1 item";
  }
  return `${count} itens`;
};

export const CategoryTileCard = ({
  categoryId,
  name,
  description,
  icon,
  iconContainerClassName,
  iconClassName,
  tagCategory,
  itemsCount,
  onEdit,
  onDelete,
  deleting = false,
  className,
}: CategoryTileCardProps) => {
  return (
    <Card
      className={cx(
        "rounded-xl border-financy-border bg-financy-surface p-[25px] transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:shadow-md focus-within:shadow-md",
        className,
      )}
      data-testid={`category-item-${categoryId}`}
    >
      <header className="flex items-start justify-between">
        <div
          className={cx(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg",
            iconContainerClassName,
          )}
        >
          <CategoryIcon icon={icon} className={cx("h-4 w-4", iconClassName)} />
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            aria-label={`Excluir categoria ${name}`}
            variant="danger"
            disabled={deleting}
            onClick={onDelete}
            data-testid={`category-delete-${categoryId}`}
          >
            <IconTrash className="h-4 w-4" />
          </IconButton>
          <IconButton
            aria-label={`Editar categoria ${name}`}
            variant="outline"
            onClick={onEdit}
            data-testid={`category-edit-${categoryId}`}
          >
            <IconSquarePen className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <div className="mt-5 min-h-[68px]">
        <h3 className="text-base font-semibold leading-6 text-financy-heading">{name}</h3>
        <p className="mt-1 h-10 overflow-hidden text-ellipsis whitespace-normal line-clamp-2 text-sm leading-5 text-financy-description">
          {description || "Sem descrição."}
        </p>
      </div>

      <footer className="mt-5 flex items-center justify-between">
        <Tag category={tagCategory}>{name}</Tag>
        <span className="text-sm leading-5 text-financy-description">
          {toItemsLabel(itemsCount)}
        </span>
      </footer>
    </Card>
  );
};
