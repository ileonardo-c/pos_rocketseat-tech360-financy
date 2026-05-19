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

type TransactionSummaryInput = {
  from?: string | null;
  to?: string | null;
};

type TransactionTypeSummary = {
  type: TransactionType;
  total: number;
  count: number;
};

type TransactionSummary = {
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  totalCount: number;
  byType: TransactionTypeSummary[];
};

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

    const payload = this.normalizeCreateInput(ctx.userId, input);
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

  async summaryByUser(ctx: GraphQLContext, input?: TransactionSummaryInput): Promise<TransactionSummary> {
    if (!ctx.userId) {
      throw new AppError("Nao autenticado", 401);
    }

    const filters = this.normalizeSummaryInput(input);
    const grouped = await this.repository.groupSummaryByTypeForUser(ctx.userId, filters);
    const incomeGroup = grouped.find((item) => item.type === "INCOME");
    const expenseGroup = grouped.find((item) => item.type === "EXPENSE");

    const incomeTotal = incomeGroup?._sum.amount ?? 0;
    const expenseTotal = expenseGroup?._sum.amount ?? 0;
    const incomeCount = incomeGroup?._count._all ?? 0;
    const expenseCount = expenseGroup?._count._all ?? 0;

    return {
      incomeTotal,
      expenseTotal,
      balance: incomeTotal - expenseTotal,
      totalCount: incomeCount + expenseCount,
      byType: [
        {
          type: "INCOME",
          total: incomeTotal,
          count: incomeCount,
        },
        {
          type: "EXPENSE",
          total: expenseTotal,
          count: expenseCount,
        },
      ],
    };
  }

  private normalizeCreateInput(userId: string, input: TransactionInput) {
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

    const receipt = this.normalizeReceiptFields(userId, input.receiptKey, input.receiptUrl);

    return {
      title,
      description: input.description?.trim() || null,
      amount: input.amount,
      type: parsedType,
      date,
      categoryId,
      ...receipt,
    };
  }

  private normalizeUpdateInput(input: TransactionUpdateInput, _id: string, userId: string) {
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

    if (input.receiptKey !== undefined || input.receiptUrl !== undefined) {
      const receipt = this.normalizeReceiptFields(userId, input.receiptKey, input.receiptUrl);
      payload.receiptKey = receipt.receiptKey;
      payload.receiptUrl = receipt.receiptUrl;
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

  private normalizeReceiptFields(userId: string, receiptKeyInput?: string | null, _receiptUrlInput?: string | null) {
    const receiptKey = this.parseOptionalString(receiptKeyInput);
    if (!receiptKey) {
      return { receiptKey: null, receiptUrl: null };
    }

    if (!this.isReceiptKeyOwnedByUser(userId, receiptKey)) {
      throw new AppError("Comprovante invalido para este usuario", 403);
    }

    return {
      receiptKey,
      receiptUrl: this.buildPublicReceiptUrl(receiptKey),
    };
  }

  private isReceiptKeyOwnedByUser(userId: string, receiptKey: string) {
    return receiptKey.startsWith(`users/${userId}/`);
  }

  private buildPublicReceiptUrl(receiptKey: string) {
    const endpoint = process.env.S3_ENDPOINT?.trim();
    const bucket = process.env.S3_BUCKET?.trim();
    if (!endpoint || !bucket) {
      throw new AppError("Configuracao S3 faltando", 500);
    }

    return `${endpoint.replace(/\/$/, "")}/${bucket}/${receiptKey}`;
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

  private normalizeSummaryInput(input?: TransactionSummaryInput) {
    const from = this.parseOptionalDate(input?.from, "start");
    const to = this.parseOptionalDate(input?.to, "end");

    if (from && to && from.getTime() > to.getTime()) {
      throw new AppError("Periodo invalido: data inicial maior que data final", 400);
    }

    return {
      from,
      to,
    };
  }

  private parseOptionalDate(value: string | null | undefined, boundary: "start" | "end") {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
    const parsedValue =
      boundary === "end" && isDateOnly ? `${normalized}T23:59:59.999Z` : normalized;

    const parsed = new Date(parsedValue);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Data invalida no filtro", 400);
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
