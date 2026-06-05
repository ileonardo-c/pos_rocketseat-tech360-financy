import type { Category, PrismaClient } from "@prisma/client";

export type CategoryWithTransactionsCount = Category & {
  transactionsCount: number;
};

export type CategoriesOverview = {
  totalCategories: number;
  totalTransactions: number;
  mostUsedCategory: {
    id: string;
    name: string;
    icon: string;
    color: string;
    count: number;
  } | null;
};

type CategoryWithCountRecord = Category & {
  _count: {
    transactions: number;
  };
};

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapCategoryWithCount(category: CategoryWithCountRecord): CategoryWithTransactionsCount {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      userId: category.userId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      transactionsCount: category._count.transactions,
    };
  }

  async findAllByUser(userId: string): Promise<CategoryWithTransactionsCount[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return categories.map((category) => this.mapCategoryWithCount(category));
  }

  async findListByUser(
    userId: string,
    options: {
      page: number;
      perPage: number;
    },
  ): Promise<CategoryWithTransactionsCount[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      skip: (options.page - 1) * options.perPage,
      take: options.perPage,
    });

    return categories.map((category) => this.mapCategoryWithCount(category));
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.category.count({
      where: {
        userId,
      },
    });
  }

  async findOverviewByUser(userId: string): Promise<CategoriesOverview> {
    const [totalCategories, categories, transactions] = await Promise.all([
      this.prisma.category.count({
        where: { userId },
      }),
      this.prisma.category.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        select: {
          categoryId: true,
        },
      }),
    ]);

    const totalTransactions = transactions.length;

    const categoryUsage = new Map<string, number>();
    for (const transaction of transactions) {
      const nextCount = (categoryUsage.get(transaction.categoryId) ?? 0) + 1;
      categoryUsage.set(transaction.categoryId, nextCount);
    }

    const mostUsedCategory = categories
      .map((category) => {
        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          count: categoryUsage.get(category.id) ?? 0,
        };
      })
      .filter((category) => category.count > 0)
      .sort((left, right) => right.count - left.count)[0];

    if (!mostUsedCategory) {
      return {
        totalCategories,
        totalTransactions,
        mostUsedCategory: null,
      };
    }

    return {
      totalCategories,
      totalTransactions,
      mostUsedCategory,
    };
  }

  async findByIdAndUser(id: string, userId: string): Promise<CategoryWithTransactionsCount | null> {
    return this.prisma.category
      .findFirst({
        where: {
          id,
          userId,
        },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      })
      .then((category) => (category ? this.mapCategoryWithCount(category) : null));
  }

  create(
    userId: string,
    input: {
      name: string;
      description: string;
      icon: string;
      color: string;
    },
  ): Promise<Category> {
    return this.prisma.category.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        icon: input.icon,
        color: input.color,
      },
    });
  }

  update(
    id: string,
    input: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
    },
  ): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  }

  deleteById(id: string): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
