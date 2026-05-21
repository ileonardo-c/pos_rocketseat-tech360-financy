import type { GraphQLContext } from "../../context";
import { AppError } from "../../lib/errors";
import type { TransactionRepository } from "./transaction-repository";

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

type TransactionCategorySummary = {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
};

type TimelineInterval = "DAY" | "MONTH";

type TransactionTimelinePoint = {
  period: string;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  cumulativeBalance: number;
  count: number;
};

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  async listByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    return this.repository.findAllByUser(ctx.userId);
  }

  async create(ctx: GraphQLContext, input: TransactionInput) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const payload = this.normalizeCreateInput(ctx.userId, input);
    await this.validateCategoryOwnership(ctx.userId, payload.categoryId);

    return this.repository.create(ctx.userId, payload);
  }

  async update(ctx: GraphQLContext, id: string, input: TransactionUpdateInput) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
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
      throw new AppError("Unauthenticated", 401);
    }

    const transaction = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!transaction) {
      return false;
    }

    await this.repository.deleteById(id);
    return true;
  }

  async summaryByUser(
    ctx: GraphQLContext,
    input?: TransactionSummaryInput,
  ): Promise<TransactionSummary> {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
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

  async summaryByCategory(
    ctx: GraphQLContext,
    input?: TransactionSummaryInput,
    limitInput?: number | null,
  ): Promise<TransactionCategorySummary[]> {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const filters = this.normalizeSummaryInput(input);
    const limit = this.normalizeSummaryLimit(limitInput);
    const grouped = await this.repository.groupSummaryByCategoryForUser(ctx.userId, filters);

    const categoryTotals = new Map<
      string,
      {
        categoryId: string;
        incomeTotal: number;
        expenseTotal: number;
        count: number;
      }
    >();

    for (const item of grouped) {
      const current = categoryTotals.get(item.categoryId) ?? {
        categoryId: item.categoryId,
        incomeTotal: 0,
        expenseTotal: 0,
        count: 0,
      };

      const amount = item._sum.amount ?? 0;
      if (item.type === "INCOME") {
        current.incomeTotal += amount;
      } else {
        current.expenseTotal += amount;
      }

      current.count += item._count._all;
      categoryTotals.set(item.categoryId, current);
    }

    const categoryIds = Array.from(categoryTotals.keys());
    const categories = await this.repository.findCategoriesByIdsForUser(ctx.userId, categoryIds);
    const categoriesById = new Map(categories.map((category) => [category.id, category.name]));

    return Array.from(categoryTotals.values())
      .map((item) => {
        const categoryName = categoriesById.get(item.categoryId) ?? "Categoria removida";
        const total = item.incomeTotal + item.expenseTotal;
        return {
          categoryId: item.categoryId,
          categoryName,
          total,
          count: item.count,
          incomeTotal: item.incomeTotal,
          expenseTotal: item.expenseTotal,
          balance: item.incomeTotal - item.expenseTotal,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  async timelineByUser(
    ctx: GraphQLContext,
    input?: TransactionSummaryInput,
    intervalInput?: TimelineInterval | null,
  ): Promise<TransactionTimelinePoint[]> {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const filters = this.normalizeSummaryInput(input);
    const interval = this.normalizeTimelineInterval(intervalInput);
    const boundedFilters = this.normalizeTimelineFilters(filters, interval);
    const transactions = await this.repository.findAllForTimelineByUser(ctx.userId, boundedFilters);

    const grouped = new Map<
      string,
      {
        period: string;
        incomeTotal: number;
        expenseTotal: number;
        count: number;
      }
    >();

    for (const transaction of transactions) {
      const period = this.formatTimelinePeriod(transaction.date, interval);
      const current = grouped.get(period) ?? {
        period,
        incomeTotal: 0,
        expenseTotal: 0,
        count: 0,
      };

      if (transaction.type === "INCOME") {
        current.incomeTotal += transaction.amount;
      } else {
        current.expenseTotal += transaction.amount;
      }
      current.count += 1;
      grouped.set(period, current);
    }

    let cumulativeBalance = 0;
    return Array.from(grouped.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((item) => {
        const balance = item.incomeTotal - item.expenseTotal;
        cumulativeBalance += balance;
        return {
          period: item.period,
          incomeTotal: item.incomeTotal,
          expenseTotal: item.expenseTotal,
          balance,
          cumulativeBalance,
          count: item.count,
        };
      });
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

  private normalizeReceiptFields(
    userId: string,
    receiptKeyInput?: string | null,
    _receiptUrlInput?: string | null,
  ) {
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

  private normalizeSummaryLimit(limitInput?: number | null) {
    if (limitInput === undefined || limitInput === null) {
      return 5;
    }

    if (!Number.isInteger(limitInput) || limitInput < 1 || limitInput > 50) {
      throw new AppError("Limite invalido: use um inteiro entre 1 e 50", 400);
    }

    return limitInput;
  }

  private normalizeTimelineInterval(intervalInput?: TimelineInterval | null): TimelineInterval {
    if (intervalInput === undefined || intervalInput === null) {
      return "DAY";
    }

    if (intervalInput !== "DAY" && intervalInput !== "MONTH") {
      throw new AppError("Intervalo invalido: use DAY ou MONTH", 400);
    }

    return intervalInput;
  }

  private normalizeTimelineFilters(
    filters: { from?: Date; to?: Date },
    interval: TimelineInterval,
  ) {
    const now = new Date();
    const to = filters.to ?? now;
    const defaultFrom =
      interval === "DAY"
        ? this.addDays(to, -89)
        : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
    const from = filters.from ?? defaultFrom;

    if (from.getTime() > to.getTime()) {
      throw new AppError("Periodo invalido: data inicial maior que data final", 400);
    }

    if (interval === "DAY") {
      const maxDays = 366;
      const diffDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
      if (diffDays > maxDays) {
        throw new AppError("Periodo muito grande para DAY: use no maximo 366 dias", 400);
      }
    } else {
      const fromMonths = from.getUTCFullYear() * 12 + from.getUTCMonth();
      const toMonths = to.getUTCFullYear() * 12 + to.getUTCMonth();
      const diffMonths = toMonths - fromMonths + 1;
      const maxMonths = 120;
      if (diffMonths > maxMonths) {
        throw new AppError("Periodo muito grande para MONTH: use no maximo 120 meses", 400);
      }
    }

    return { from, to };
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private formatTimelinePeriod(date: Date, interval: TimelineInterval) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    if (interval === "MONTH") {
      return `${year}-${month}`;
    }

    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
