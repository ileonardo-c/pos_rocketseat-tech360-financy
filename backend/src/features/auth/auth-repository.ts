import type { Prisma, PrismaClient, User } from "@prisma/client";

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createUser(name: string, email: string, password: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const exactMatch = await this.prisma.user.findUnique({
      where: { email },
    });
    if (exactMatch) {
      return exactMatch;
    }

    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  updateUser(
    id: string,
    data: { name?: string; email?: string; avatarKey?: string | null; avatarUrl?: string | null },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  createPasswordResetCode(data: Prisma.PasswordResetCodeUncheckedCreateInput) {
    return this.prisma.passwordResetCode.create({
      data,
    });
  }

  findActivePasswordResetCode(email: string, userId: string) {
    return this.prisma.passwordResetCode.findFirst({
      where: {
        userId,
        email,
        usedAt: null,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  incrementPasswordResetAttempts(id: string) {
    return this.prisma.passwordResetCode.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  markPasswordResetCodeAsUsed(id: string) {
    return this.prisma.passwordResetCode.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }

  markOlderPasswordResetCodesAsUsed(userId: string, before: Date) {
    return this.prisma.passwordResetCode.updateMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: before } }, { usedAt: { not: null } }],
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  countPasswordResetCodesByUser(userId: string, since: Date) {
    return this.prisma.passwordResetCode.count({
      where: {
        userId,
        usedAt: null,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  clearPasswordResetCodesForUser(userId: string, withinMinutes: number) {
    return this.prisma.passwordResetCode.deleteMany({
      where: {
        userId,
        OR: [
          { usedAt: { not: null } },
          { expiresAt: { lt: new Date() } },
          {
            createdAt: {
              lt: new Date(Date.now() - withinMinutes * 60 * 1000),
            },
          },
        ],
      },
    });
  }
}
