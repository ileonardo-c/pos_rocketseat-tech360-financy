import type { GraphQLContext } from "../../context";
import { TransactionRepository } from "./transaction-repository";

type TransactionType = "INCOME" | "EXPENSE";

type TransactionInput = {
  title: string;
  description?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string;
};

type TransactionUpdateInput = Partial<TransactionInput>;

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  async listByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new Error("Nao autenticado");
    }

    return this.repository.findAllByUser(ctx.userId);
  }

  async create(ctx: GraphQLContext, input: TransactionInput) {
    if (!ctx.userId) {
      throw new Error("Nao autenticado");
    }

    const payload = this.normalizeCreateInput(input);
    await this.validateCategoryOwnership(ctx.userId, payload.categoryId);

    return this.repository.create(ctx.userId, payload);
  }

  async update(ctx: GraphQLContext, id: string, input: TransactionUpdateInput) {
    if (!ctx.userId) {
      throw new Error("Nao autenticado");
    }

    const transaction = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!transaction) {
      throw new Error("Transacao nao encontrada");
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
      throw new Error("Nao autenticado");
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
      throw new Error("Titulo da transacao eh obrigatorio");
    }

    if (!Number.isFinite(input.amount)) {
      throw new Error("Valor invalido");
    }

    const parsedType = this.parseType(input.type);
    const date = this.parseDate(input.date);
    const categoryId = (input.categoryId ?? "").trim();
    if (!categoryId) {
      throw new Error("Categoria eh obrigatoria");
    }

    return {
      title,
      description: input.description?.trim() || null,
      amount: input.amount,
      type: parsedType,
      date,
      categoryId,
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
    } = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Titulo da transacao eh obrigatorio");
      }
      payload.title = title;
    }

    if (input.description !== undefined) {
      payload.description = input.description?.trim() || null;
    }

    if (input.amount !== undefined) {
      if (!Number.isFinite(input.amount)) {
        throw new Error("Valor invalido");
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
        throw new Error("Categoria eh obrigatoria");
      }
      payload.categoryId = categoryId;
    }

    return payload;
  }

  private parseType(type: TransactionType): TransactionType {
    if (type !== "INCOME" && type !== "EXPENSE") {
      throw new Error("Tipo invalido");
    }
    return type;
  }

  private parseDate(date: string | Date): Date {
    const parsedDate = typeof date === "string" ? date.trim() : date;
    if (parsedDate instanceof Date) {
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Data invalida");
      }
      return parsedDate;
    }

    if (!parsedDate) {
      throw new Error("Data eh obrigatoria");
    }

    const parsed = new Date(parsedDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Data invalida");
    }

    return parsed;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.repository.findCategoryByIdAndUser(categoryId, userId);
    if (!category) {
      throw new Error("Categoria nao encontrada");
    }
  }
}
