import type { GraphQLContext } from "../../context";
import { AppError } from "../../lib/errors";
import { TransactionRepository } from "./transaction-repository";

type TransactionType = "INCOME" | "EXPENSE";

type TransactionInput = {
  title: string;
  description?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
  receiptKey?: string | null;
  receiptUrl?: string | null;
};

type TransactionUpdateInput = Partial<TransactionInput>;

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  async listByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Nao autenticado", 401);
    }

    return this.repository.findAllByUser(ctx.userId);
  }

  async create(ctx: GraphQLContext, input: TransactionInput) {
    if (!ctx.userId) {
      throw new AppError("Nao autenticado", 401);
    }

    const payload = this.normalizeCreateInput(input);
    await this.validateCategoryOwnership(ctx.userId, payload.categoryId);

    return this.repository.create(ctx.userId, payload);
  }

  async update(ctx: GraphQLContext, id: string, input: TransactionUpdateInput) {
    if (!ctx.userId) {
      throw new AppError("Nao autenticado", 401);
    }

    const transaction = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!transaction) {
      throw new AppError("Transacao nao encontrada", 404);
    }

    const payload = this.normalizeUpdateInput(input, id, ctx.userId);
    if (payload.categoryId) {
      await this.validateCategoryOwnership(ctx.userId, payload.categoryId);
    }

    if (Object.keys(payload).length === 0) {
      return transaction;
    }

    return this.repository.update(id, payload);
  }

  async delete(ctx: GraphQLContext, id: string) {
    if (!ctx.userId) {
      throw new AppError("Nao autenticado", 401);
    }

    const transaction = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!transaction) {
      return false;
    }

    await this.repository.deleteById(id);
    return true;
  }

  private normalizeCreateInput(input: TransactionInput) {
    const title = (input.title ?? "").trim();
    if (!title) {
      throw new AppError("Titulo da transacao eh obrigatorio", 400);
    }

    if (!Number.isFinite(input.amount)) {
      throw new AppError("Valor invalido", 400);
    }

    const parsedType = this.parseType(input.type);
    const date = this.parseDate(input.date);
    const categoryId = (input.categoryId ?? "").trim();
    if (!categoryId) {
      throw new AppError("Categoria eh obrigatoria", 400);
    }

    return {
      title,
      description: input.description?.trim() || null,
      amount: input.amount,
      type: parsedType,
      date,
      categoryId,
      receiptKey: this.parseOptionalString(input.receiptKey),
      receiptUrl: this.parseOptionalString(input.receiptUrl),
    };
  }

  private normalizeUpdateInput(input: TransactionUpdateInput, _id: string, _userId: string) {
    const payload: {
      title?: string;
      description?: string | null;
      amount?: number;
      type?: TransactionType;
      date?: Date;
      categoryId?: string;
      receiptKey?: string | null;
      receiptUrl?: string | null;
    } = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new AppError("Titulo da transacao eh obrigatorio", 400);
      }
      payload.title = title;
    }

    if (input.description !== undefined) {
      payload.description = input.description?.trim() || null;
    }

    if (input.amount !== undefined) {
      if (!Number.isFinite(input.amount)) {
        throw new AppError("Valor invalido", 400);
      }
      payload.amount = input.amount;
    }

    if (input.type !== undefined) {
      payload.type = this.parseType(input.type);
    }

    if (input.date !== undefined) {
      payload.date = this.parseDate(input.date);
    }

    if (input.categoryId !== undefined) {
      const categoryId = input.categoryId.trim();
      if (!categoryId) {
        throw new AppError("Categoria eh obrigatoria", 400);
      }
      payload.categoryId = categoryId;
    }

    if (input.receiptKey !== undefined) {
      payload.receiptKey = this.parseOptionalString(input.receiptKey);
    }

    if (input.receiptUrl !== undefined) {
      payload.receiptUrl = this.parseOptionalString(input.receiptUrl);
    }

    return payload;
  }

  private parseOptionalString(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private parseType(type: TransactionType): TransactionType {
    if (type !== "INCOME" && type !== "EXPENSE") {
      throw new AppError("Tipo invalido", 400);
    }
    return type;
  }

  private parseDate(date: string | Date): Date {
    const parsedDate = typeof date === "string" ? date.trim() : date;
    if (parsedDate instanceof Date) {
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError("Data invalida", 400);
      }
      return parsedDate;
    }

    if (!parsedDate) {
      throw new AppError("Data eh obrigatoria", 400);
    }

    const parsed = new Date(parsedDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Data invalida", 400);
    }

    return parsed;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.repository.findCategoryByIdAndUser(categoryId, userId);
    if (!category) {
      throw new AppError("Categoria nao encontrada", 404);
    }
  }
}
