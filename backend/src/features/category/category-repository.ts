import { PrismaClient } from "@prisma/client";

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(userId: string, name: string) {
    return this.prisma.category.create({
      data: {
        name,
        userId,
      },
    });
  }

  findManyByUser(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  findByUser(categoryId: string, userId: string) {
    return this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
  }

  update(categoryId: string, userId: string, name: string) {
    return this.prisma.category.updateMany({
      where: { id: categoryId, userId },
      data: { name },
    });
  }

  remove(categoryId: string, userId: string) {
    return this.prisma.category.deleteMany({
      where: { id: categoryId, userId },
    });
  }
}
