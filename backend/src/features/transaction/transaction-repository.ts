import type { PrismaClient, TransactionType } from "@prisma/client";
import type { Transaction } from "@prisma/client";

export class TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAllByUser(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "desc",
      },
    });
  }

  findByIdAndUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        category: true,
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
        category: true,
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
        category: true,
      },
    });
  }

  deleteById(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });
  }
}
