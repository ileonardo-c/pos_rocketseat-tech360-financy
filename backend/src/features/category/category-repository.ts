import type { PrismaClient } from "@prisma/client";
import type { Category } from "@prisma/client";

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAllByUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findByIdAndUser(id: string, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  create(userId: string, name: string): Promise<Category> {
    return this.prisma.category.create({
      data: {
        userId,
        name,
      },
    });
  }

  update(id: string, name: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        name,
      },
    });
  }

  deleteById(id: string): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
