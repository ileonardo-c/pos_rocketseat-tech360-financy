import { BrandLogo } from "@/components/ui/brand-logo";
import { useAuth } from "@/lib/auth/auth-provider";
import { cx } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

type DashboardNavItem = "dashboard" | "transactions" | "categories";

type DashboardNavProps = {
  active?: DashboardNavItem | null;
  currentPath?: string;
  userInitials?: string;
  className?: string;
};

const getItemClassName = (isActive: boolean) =>
  cx(
    "inline-flex items-center text-sm leading-5 transition-colors duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/25",
    isActive
      ? "font-semibold text-financy-primary"
      : "font-normal text-financy-text-secondary hover:text-financy-text",
  );

const getUserInitials = (name?: string | null) => {
  if (!name) {
    return "US";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "US";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

const resolveActiveItem = (
  pathname: string,
  manualActive?: DashboardNavItem | null,
): DashboardNavItem | null => {
  if (manualActive !== undefined) {
    return manualActive;
  }

  if (pathname.startsWith("/transactions")) {
    return "transactions";
  }

  if (pathname.startsWith("/categories")) {
    return "categories";
  }

  if (pathname === "/dashboard" || pathname === "/") {
    return "dashboard";
  }

  return null;
};

export const DashboardNav = ({
  active,
  currentPath,
  userInitials,
  className,
}: DashboardNavProps) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const resolvedPath = currentPath ?? pathname;
  const activeItem = resolveActiveItem(resolvedPath, active);
  const resolvedUserInitials = userInitials ?? getUserInitials(user?.name);

  return (
    <header
      data-testid="dashboard-nav-header"
      className={cx(
        "sticky top-0 z-60 border-b border-financy-border bg-financy-surface/95 backdrop-blur-sm",
        className,
      )}
    >
      <div className="relative mx-auto flex h-[69px] w-full max-w-[1184px] items-center px-4 sm:px-6">
        <BrandLogo
          className="h-6 w-[100px]"
          iconClassName="h-6 w-6"
          textClassName="h-[14px] w-[67px]"
        />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 md:flex">
          <Link className={getItemClassName(activeItem === "dashboard")} to="/">
            Dashboard
          </Link>
          <Link className={getItemClassName(activeItem === "transactions")} to="/transactions">
            Transações
          </Link>
          <Link className={getItemClassName(activeItem === "categories")} to="/categories">
            Categorias
          </Link>
        </nav>

        <Link
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-financy-text transition-[transform,background-color,box-shadow] duration-200 ease-out hover:scale-105 hover:bg-gray-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/30"
          to="/profile"
        >
          {user?.avatarUrl ? (
            <img
              alt={user.name ? `Avatar de ${user.name}` : "Avatar do usuário"}
              className="h-full w-full rounded-full object-cover"
              src={user.avatarUrl}
            />
          ) : (
            resolvedUserInitials
          )}
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[1184px] px-4 pb-3 sm:px-6 md:hidden">
        <nav className="flex items-center gap-5 overflow-x-auto whitespace-nowrap">
          <Link className={getItemClassName(activeItem === "dashboard")} to="/">
            Dashboard
          </Link>
          <Link className={getItemClassName(activeItem === "transactions")} to="/transactions">
            Transações
          </Link>
          <Link className={getItemClassName(activeItem === "categories")} to="/categories">
            Categorias
          </Link>
        </nav>
      </div>
    </header>
  );
};
