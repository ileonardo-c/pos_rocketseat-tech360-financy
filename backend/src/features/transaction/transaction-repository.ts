import type { Prisma } from "@prisma/client";
import type { PrismaClient, TransactionType } from "@prisma/client";
import type { Transaction } from "@prisma/client";

export class TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private getCategoryInclude() {
    return {
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    };
  }

  findLatestByUser(userId: string): Promise<{ date: Date } | null> {
    return this.prisma.transaction.findFirst({
      where: {
        userId,
      },
      select: {
        date: true,
      },
      orderBy: {
        date: "desc",
      },
    });
  }

  findAllByUser(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
      },
      include: {
        category: this.getCategoryInclude(),
      },
      orderBy: {
        date: "desc",
      },
    });
  }

  findListByUser(
    userId: string,
    options: {
      query?: string;
      type?: TransactionType;
      categoryId?: string;
      from?: Date;
      to?: Date;
      sortField: "DATE" | "AMOUNT" | "TITLE";
      sortDirection: "ASC" | "DESC";
      page: number;
      perPage: number;
    },
  ): Promise<Transaction[]> {
    const where = this.buildListWhere(userId, options);

    const direction = options.sortDirection === "ASC" ? "asc" : "desc";
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
      options.sortField === "AMOUNT"
        ? [{ amount: direction }, { createdAt: direction }, { id: direction }]
        : options.sortField === "TITLE"
          ? [{ title: direction }, { createdAt: direction }, { id: direction }]
          : [{ date: direction }, { createdAt: direction }, { id: direction }];

    return this.prisma.transaction.findMany({
      where,
      include: {
        category: this.getCategoryInclude(),
      },
      orderBy,
      skip: (options.page - 1) * options.perPage,
      take: options.perPage,
    });
  }

  countListByUser(
    userId: string,
    options: {
      query?: string;
      type?: TransactionType;
      categoryId?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<number> {
    return this.prisma.transaction.count({
      where: this.buildListWhere(userId, options),
    });
  }

  findByIdAndUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        category: this.getCategoryInclude(),
      },
    });
  }

  findCategoryByIdAndUser(id: string, userId: string) {
    return this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  groupSummaryByTypeForUser(
    userId: string,
    filters: {
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.transaction.groupBy({
      by: ["type"] as const,
      where: {
        userId,
        date: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });
  }

  groupSummaryByCategoryForUser(
    userId: string,
    filters: {
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.transaction.groupBy({
      by: ["categoryId", "type"] as const,
      where: {
        userId,
        date: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    });
  }

  findCategoriesByIdsForUser(userId: string, ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.category.findMany({
      where: {
        userId,
        id: { in: ids },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  findAllForTimelineByUser(
    userId: string,
    filters: {
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: {
        date: "asc",
      },
    });
  }

  findRecentByUser(
    userId: string,
    filters: {
      from: Date;
      to: Date;
    },
    limit: number,
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: filters.from,
          lte: filters.to,
        },
      },
      include: {
        category: this.getCategoryInclude(),
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  }

  create(
    userId: string,
    data: {
      title: string;
      description?: string | null;
      amount: number;
      type: TransactionType;
      date: Date;
      categoryId: string;
      receiptKey?: string | null;
      receiptUrl?: string | null;
    },
  ): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        userId,
        ...data,
      },
      include: {
        category: this.getCategoryInclude(),
      },
    });
  }

  update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      amount?: number;
      type?: TransactionType;
      date?: Date;
      categoryId?: string;
      receiptKey?: string | null;
      receiptUrl?: string | null;
    },
  ): Promise<Transaction> {
    return this.prisma.transaction.update({
      where: {
        id,
      },
      data,
      include: {
        category: this.getCategoryInclude(),
      },
    });
  }

  deleteById(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({
      where: {
        id,
      },
      include: {
        category: this.getCategoryInclude(),
      },
    });
  }

  private buildListWhere(
    userId: string,
    options: {
      query?: string;
      type?: TransactionType;
      categoryId?: string;
      from?: Date;
      to?: Date;
    },
  ): Prisma.TransactionWhereInput {
    const searchQuery = options.query?.trim();

    return {
      userId,
      ...(options.type ? { type: options.type } : {}),
      ...(options.categoryId ? { categoryId: options.categoryId } : {}),
      date: {
        ...(options.from ? { gte: options.from } : {}),
        ...(options.to ? { lte: options.to } : {}),
      },
      ...(searchQuery
        ? {
            OR: [
              { title: { contains: searchQuery, mode: "insensitive" } },
              { description: { contains: searchQuery, mode: "insensitive" } },
              { category: { is: { name: { contains: searchQuery, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
  }
}
