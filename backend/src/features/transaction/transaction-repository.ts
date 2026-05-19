import { PrismaClient, TransactionType } from "@prisma/client";

export class TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(userId: string, input: {
    amount: number;
    description?: string | null;
    type: TransactionType;
    title: string;
    categoryId: string;
    date?: string | null;
  }) {
    return this.prisma.transaction.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        amount: input.amount,
        type: input.type,
        categoryId: input.categoryId,
        date: input.date ? new Date(input.date) : new Date(),
      },
      include: {
        category: true,
      },
    });
  }

  listByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findByUser(transactionId: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { category: true },
    });
  }

  update(transactionId: string, userId: string, data: {
    amount?: number;
    description?: string | null;
    type?: TransactionType;
    title?: string;
    categoryId?: string;
    date?: string | null;
  }) {
    return this.prisma.transaction.updateMany({
      where: { id: transactionId, userId },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  remove(transactionId: string, userId: string) {
    return this.prisma.transaction.deleteMany({
      where: { id: transactionId, userId },
    });
  }
}
