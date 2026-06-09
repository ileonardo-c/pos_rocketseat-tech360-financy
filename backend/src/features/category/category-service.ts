import type { GraphQLContext } from "@/context";
import { AppError } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import type { CategoryRepository } from "./category-repository";

const CATEGORY_ERROR_CODES = {
  unauthenticated: "CATEGORY_UNAUTHENTICATED",
  nameRequired: "CATEGORY_NAME_REQUIRED",
  descriptionTooLong: "CATEGORY_DESCRIPTION_TOO_LONG",
  invalidIcon: "CATEGORY_INVALID_ICON",
  invalidColor: "CATEGORY_INVALID_COLOR",
  alreadyExists: "CATEGORY_ALREADY_EXISTS",
  notFound: "CATEGORY_NOT_FOUND",
  hasLinkedTransactions: "CATEGORY_HAS_LINKED_TRANSACTIONS",
  invalidPage: "CATEGORY_INVALID_PAGE",
  invalidPerPage: "CATEGORY_INVALID_PER_PAGE",
} as const;

const DESCRIPTION_MAX_LENGTH = 80;
const PER_PAGE_MAX = 50;
const PER_PAGE_DEFAULT = 8;

type CategoryVisual = {
  icon: string;
  color: string;
};

const CATEGORY_ICON_KEYS = [
  "tag",
  "briefcase-business",
  "car-front",
  "heart-pulse",
  "piggy-bank",
  "shopping-cart",
  "ticket",
  "tool-case",
  "utensils",
  "paw-print",
  "house",
  "gift",
  "dumbbell",
  "book-open",
  "baggage-claim",
  "mailbox",
  "receipt-text",
] as const;

const CATEGORY_COLOR_KEYS = [
  "gray",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
] as const;

type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];
type CategoryColorKey = (typeof CATEGORY_COLOR_KEYS)[number];

const CATEGORY_ICON_SET = new Set<string>(CATEGORY_ICON_KEYS);
const CATEGORY_COLOR_SET = new Set<string>(CATEGORY_COLOR_KEYS);

type CategoryMutationInput = {
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
};

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  private normalizeName(name: string | null | undefined): string {
    const normalized = (name ?? "").trim();
    if (!normalized) {
      throw new AppError("Category name is required", 422, CATEGORY_ERROR_CODES.nameRequired);
    }
    return normalized;
  }

  private normalizeDescription(description: string | null | undefined): string {
    const normalized = (description ?? "").trim();
    if (!normalized) {
      return "";
    }
    if (normalized.length > DESCRIPTION_MAX_LENGTH) {
      throw new AppError(
        `Category description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
        422,
        CATEGORY_ERROR_CODES.descriptionTooLong,
      );
    }
    return normalized;
  }

  private normalizeIcon(icon: string | null | undefined): CategoryIconKey | undefined {
    if (icon === undefined || icon === null) {
      return undefined;
    }

    const normalized = icon.trim();
    if (!normalized) {
      return undefined;
    }

    if (!CATEGORY_ICON_SET.has(normalized)) {
      throw new AppError("Invalid category icon", 422, CATEGORY_ERROR_CODES.invalidIcon);
    }

    return normalized as CategoryIconKey;
  }

  private normalizeColor(color: string | null | undefined): CategoryColorKey | undefined {
    if (color === undefined || color === null) {
      return undefined;
    }

    const normalized = color.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    if (!CATEGORY_COLOR_SET.has(normalized)) {
      throw new AppError("Invalid category color", 422, CATEGORY_ERROR_CODES.invalidColor);
    }

    return normalized as CategoryColorKey;
  }

  private normalizeSearchKey(value: string): string {
    return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  private resolveCategoryVisual(name: string): CategoryVisual {
    const key = this.normalizeSearchKey(name);

    if (key.includes("alimenta")) {
      return { icon: "utensils", color: "blue" };
    }
    if (key.includes("transporte")) {
      return { icon: "car-front", color: "purple" };
    }
    if (key.includes("mercado")) {
      return { icon: "shopping-cart", color: "orange" };
    }
    if (key.includes("entretenimento")) {
      return { icon: "ticket", color: "pink" };
    }
    if (key.includes("investimento")) {
      return { icon: "piggy-bank", color: "green" };
    }
    if (key.includes("salario") || key.includes("renda")) {
      return { icon: "briefcase-business", color: "green" };
    }
    if (key.includes("saude")) {
      return { icon: "heart-pulse", color: "red" };
    }
    if (key.includes("utilidade") || key.includes("conta")) {
      return { icon: "tool-case", color: "yellow" };
    }

    return { icon: "tag", color: "gray" };
  }

  private normalizePage(pageInput?: number | null): number {
    const page = pageInput ?? 1;
    if (!Number.isInteger(page) || page < 1) {
      throw new AppError(
        "Invalid page: use an integer greater than 0",
        422,
        CATEGORY_ERROR_CODES.invalidPage,
      );
    }
    return page;
  }

  private normalizePerPage(perPageInput?: number | null): number {
    const perPage = perPageInput ?? PER_PAGE_DEFAULT;
    if (!Number.isInteger(perPage) || perPage < 1) {
      throw new AppError(
        "Invalid perPage: use an integer greater than 0",
        422,
        CATEGORY_ERROR_CODES.invalidPerPage,
      );
    }
    return Math.min(perPage, PER_PAGE_MAX);
  }

  async listByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    return this.repository.findAllByUser(ctx.userId);
  }

  async listByPage(ctx: GraphQLContext, pageInput?: number | null, perPageInput?: number | null) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    const page = this.normalizePage(pageInput);
    const perPage = this.normalizePerPage(perPageInput);

    return this.repository.findListByUser(ctx.userId, { page, perPage });
  }

  async countByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    return this.repository.countByUser(ctx.userId);
  }

  async overviewByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    return this.repository.findOverviewByUser(ctx.userId);
  }

  async create(ctx: GraphQLContext, input: CategoryMutationInput) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    const normalizedName = this.normalizeName(input.name);
    const normalizedDescription = this.normalizeDescription(input.description);
    const fallbackVisual = this.resolveCategoryVisual(normalizedName);
    const icon = this.normalizeIcon(input.icon) ?? fallbackVisual.icon;
    const color = this.normalizeColor(input.color) ?? fallbackVisual.color;

    try {
      const category = await this.repository.create(ctx.userId, {
        name: normalizedName,
        description: normalizedDescription,
        icon,
        color,
      });
      return {
        ...category,
        transactionsCount: 0,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Category name already exists", 409, CATEGORY_ERROR_CODES.alreadyExists);
      }
      throw error;
    }
  }

  async update(ctx: GraphQLContext, id: string, input: CategoryMutationInput) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    const category = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!category) {
      throw new AppError("Category not found", 404, CATEGORY_ERROR_CODES.notFound);
    }

    const payload: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
    } = {};

    if (input.name !== undefined) {
      payload.name = this.normalizeName(input.name);
    }

    if (input.description !== undefined) {
      payload.description = this.normalizeDescription(input.description);
    }

    const normalizedIcon = this.normalizeIcon(input.icon);
    const normalizedColor = this.normalizeColor(input.color);

    if (normalizedIcon !== undefined) {
      payload.icon = normalizedIcon;
    }

    if (normalizedColor !== undefined) {
      payload.color = normalizedColor;
    }

    if (Object.keys(payload).length === 0) {
      return category;
    }

    try {
      await this.repository.update(id, payload);
      return await this.repository.findByIdAndUser(id, ctx.userId).then((updated) => {
        if (!updated) {
          throw new AppError("Category not found", 404, CATEGORY_ERROR_CODES.notFound);
        }
        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Category name already exists", 409, CATEGORY_ERROR_CODES.alreadyExists);
      }
      throw error;
    }
  }

  async delete(ctx: GraphQLContext, id: string) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, CATEGORY_ERROR_CODES.unauthenticated);
    }

    const category = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!category) {
      return false;
    }

    try {
      await this.repository.deleteById(id);
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError(
          "Category has linked transactions",
          409,
          CATEGORY_ERROR_CODES.hasLinkedTransactions,
        );
      }
      throw error;
    }
  }
}
