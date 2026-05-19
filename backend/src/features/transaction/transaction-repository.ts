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

  create(
    userId: string,
    data: {
      title: string;
      description?: string | null;
      amount: number;
      type: TransactionType;
      date: Date;
      categoryId: string;
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
