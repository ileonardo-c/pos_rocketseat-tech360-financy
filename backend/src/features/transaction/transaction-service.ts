import type { GraphQLContext } from "@/context";
import { AppError } from "@/lib/errors";
import { getStorageConfig } from "@/lib/storage-env";
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

type TransactionListFilterInput = {
  query?: string | null;
  type?: string | null;
  categoryId?: string | null;
  from?: string | null;
  to?: string | null;
};

type TransactionSortInput = {
  field?: "DATE" | "AMOUNT" | "TITLE" | null;
  direction?: "ASC" | "DESC" | null;
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

type TransactionsInitialPeriodSource = "LATEST_TRANSACTION" | "CURRENT_MONTH";

type TransactionsInitialPeriod = {
  from: string;
  to: string;
  source: TransactionsInitialPeriodSource;
};

export class TransactionService {
  constructor(private readonly repository: TransactionRepository) {}

  async listByUser(
    ctx: GraphQLContext,
    filterInput?: TransactionListFilterInput,
    sortInput?: TransactionSortInput | null,
    pageInput?: number | null,
    perPageInput?: number | null,
  ) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const filter = this.normalizeListFilter(filterInput);
    const sort = this.normalizeListSort(sortInput);
    const pagination = this.normalizeListPagination(pageInput, perPageInput);

    return this.repository.findListByUser(ctx.userId, {
      ...filter,
      sortField: sort.field,
      sortDirection: sort.direction,
      page: pagination.page,
      perPage: pagination.perPage,
    });
  }

  async countByUser(ctx: GraphQLContext, filterInput?: TransactionListFilterInput) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const filter = this.normalizeListFilter(filterInput);

    return this.repository.countListByUser(ctx.userId, filter);
  }

  async initialPeriodByUser(ctx: GraphQLContext): Promise<TransactionsInitialPeriod> {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const latest = await this.repository.findLatestByUser(ctx.userId);
    const reference = latest?.date ?? new Date();
    const range = this.buildMonthRangeFromDate(reference);

    return {
      from: this.formatDateOnlyUTC(range.from),
      to: this.formatDateOnlyUTC(range.to),
      source: latest ? "LATEST_TRANSACTION" : "CURRENT_MONTH",
    };
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
      throw new AppError("Transaction not found", 404);
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

    const filters = this.normalizeDashboardFilter(input);
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

    const filters = this.normalizeDashboardFilter(input);
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
        const categoryName = categoriesById.get(item.categoryId) ?? "Removed category";
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

    const filters = this.normalizeDashboardFilter(input);
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

  async recentByUser(
    ctx: GraphQLContext,
    input?: TransactionSummaryInput,
    limitInput?: number | null,
  ) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const filters = this.normalizeDashboardFilter(input);
    const limit = this.normalizeSummaryLimit(limitInput);

    return this.repository.findRecentByUser(ctx.userId, filters, limit);
  }

  private normalizeCreateInput(userId: string, input: TransactionInput) {
    const title = (input.title ?? "").trim();
    if (!title) {
      throw new AppError("Transaction title is required", 400);
    }

    if (!Number.isFinite(input.amount)) {
      throw new AppError("Invalid amount", 400);
    }

    const parsedType = this.parseType(input.type);
    const date = this.parseDate(input.date);
    const categoryId = (input.categoryId ?? "").trim();
    if (!categoryId) {
      throw new AppError("Category is required", 400);
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
        throw new AppError("Transaction title is required", 400);
      }
      payload.title = title;
    }

    if (input.description !== undefined) {
      payload.description = input.description?.trim() || null;
    }

    if (input.amount !== undefined) {
      if (!Number.isFinite(input.amount)) {
        throw new AppError("Invalid amount", 400);
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
        throw new AppError("Category is required", 400);
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
      throw new AppError("Invalid receipt for this user", 403);
    }

    if (!this.hasStorageConfiguration()) {
      throw new AppError("Receipt storage is not available", 400);
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
    const { endpoint = "", publicEndpoint, bucket = "" } = getStorageConfig();
    const receiptEndpoint = publicEndpoint || endpoint;

    return `${receiptEndpoint.replace(/\/$/, "")}/${bucket}/${receiptKey}`;
  }

  private hasStorageConfiguration() {
    const { endpoint, bucket } = getStorageConfig();
    return Boolean(endpoint && bucket);
  }

  private parseType(type: TransactionType): TransactionType {
    if (type !== "INCOME" && type !== "EXPENSE") {
      throw new AppError("Invalid type", 400);
    }
    return type;
  }

  private parseDate(date: string | Date): Date {
    const parsedDate = typeof date === "string" ? date.trim() : date;
    if (parsedDate instanceof Date) {
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError("Invalid date", 400);
      }
      return parsedDate;
    }

    if (!parsedDate) {
      throw new AppError("Date is required", 400);
    }

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parsedDate);
    if (dateOnlyMatch) {
      const [, yearRaw, monthRaw, dayRaw] = dateOnlyMatch;
      const year = Number.parseInt(yearRaw, 10);
      const month = Number.parseInt(monthRaw, 10);
      const day = Number.parseInt(dayRaw, 10);

      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      if (
        utcDate.getUTCFullYear() !== year ||
        utcDate.getUTCMonth() !== month - 1 ||
        utcDate.getUTCDate() !== day
      ) {
        throw new AppError("Invalid date", 400);
      }

      return utcDate;
    }

    const parsed = new Date(parsedDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Invalid date", 400);
    }

    return parsed;
  }

  private normalizeDashboardFilter(input?: TransactionSummaryInput) {
    if (!input?.from || !input?.to) {
      throw new AppError(
        "Dashboard period filter requires from and to",
        422,
        "DASHBOARD_FILTER_REQUIRED",
      );
    }

    const from = this.parseRequiredDate(input.from, "start");
    const to = this.parseRequiredDate(input.to, "end");

    if (from.getTime() > to.getTime()) {
      throw new AppError(
        "Invalid range: start date is greater than end date",
        422,
        "DASHBOARD_FILTER_INVALID_RANGE",
      );
    }

    return { from, to };
  }

  private normalizeSummaryLimit(limitInput?: number | null) {
    if (limitInput === undefined || limitInput === null) {
      return 5;
    }

    if (!Number.isInteger(limitInput) || limitInput < 1) {
      throw new AppError("Invalid limit: use an integer greater than 0", 400);
    }

    return Math.min(limitInput, 50);
  }

  private normalizeListSort(input?: TransactionSortInput | null) {
    const field = input?.field ?? "DATE";
    const direction = input?.direction ?? "DESC";

    if (field !== "DATE" && field !== "AMOUNT" && field !== "TITLE") {
      throw new AppError("Invalid sort field", 400);
    }

    if (direction !== "ASC" && direction !== "DESC") {
      throw new AppError("Invalid sort direction", 400);
    }

    return { field, direction };
  }

  private normalizeListPagination(pageInput?: number | null, perPageInput?: number | null) {
    const rawPage = pageInput ?? 1;
    const rawPerPage = perPageInput ?? 10;

    if (!Number.isInteger(rawPage) || rawPage < 1) {
      throw new AppError("Invalid page: use an integer greater than 0", 400);
    }

    if (!Number.isInteger(rawPerPage) || rawPerPage < 1) {
      throw new AppError("Invalid perPage: use an integer greater than 0", 400);
    }

    return {
      page: rawPage,
      perPage: Math.min(rawPerPage, 50),
    };
  }

  private normalizeListFilter(input?: TransactionListFilterInput) {
    const query = this.parseOptionalString(input?.query) ?? undefined;
    const categoryId = this.parseOptionalString(input?.categoryId) ?? undefined;

    let type: TransactionType | undefined;
    if (input?.type) {
      type = this.parseType(input.type as TransactionType);
    }

    const fromInput = input?.from?.trim();
    const toInput = input?.to?.trim();
    const hasFrom = Boolean(fromInput);
    const hasTo = Boolean(toInput);

    if (hasFrom !== hasTo) {
      throw new AppError(
        "Transaction list filter requires both from and to",
        422,
        "TRANSACTION_FILTER_PARTIAL_RANGE",
      );
    }

    if (fromInput && toInput) {
      const from = this.parseRequiredDate(fromInput, "start");
      const to = this.parseRequiredDate(toInput, "end");

      if (from.getTime() > to.getTime()) {
        throw new AppError(
          "Invalid range: start date is greater than end date",
          422,
          "TRANSACTION_FILTER_INVALID_RANGE",
        );
      }

      return {
        query,
        type,
        categoryId,
        from,
        to,
      };
    }

    const defaultRange = this.getCurrentMonthRange();

    return {
      query,
      type,
      categoryId,
      from: defaultRange.from,
      to: defaultRange.to,
    };
  }

  private getCurrentMonthRange() {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    return { from, to };
  }

  private buildMonthRangeFromDate(reference: Date) {
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth();
    const from = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    return { from, to };
  }

  private formatDateOnlyUTC(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private normalizeTimelineInterval(intervalInput?: TimelineInterval | null): TimelineInterval {
    if (intervalInput === undefined || intervalInput === null) {
      return "DAY";
    }

    if (intervalInput !== "DAY" && intervalInput !== "MONTH") {
      throw new AppError("Invalid interval: use DAY or MONTH", 400);
    }

    return intervalInput;
  }

  private normalizeTimelineFilters(filters: { from: Date; to: Date }, interval: TimelineInterval) {
    const { from, to } = filters;

    if (interval === "DAY") {
      const maxDays = 366;
      const diffDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
      if (diffDays > maxDays) {
        throw new AppError(
          "Range too large for DAY: use at most 366 days",
          422,
          "DASHBOARD_FILTER_RANGE_TOO_LARGE",
        );
      }
    } else {
      const fromMonths = from.getUTCFullYear() * 12 + from.getUTCMonth();
      const toMonths = to.getUTCFullYear() * 12 + to.getUTCMonth();
      const diffMonths = toMonths - fromMonths + 1;
      const maxMonths = 120;
      if (diffMonths > maxMonths) {
        throw new AppError(
          "Range too large for MONTH: use at most 120 months",
          422,
          "DASHBOARD_FILTER_RANGE_TOO_LARGE",
        );
      }
    }

    return { from, to };
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

  private parseRequiredDate(value: string, boundary: "start" | "end") {
    const normalized = value.trim();
    if (!normalized) {
      throw new AppError(
        "Dashboard period filter requires from and to",
        422,
        "DASHBOARD_FILTER_REQUIRED",
      );
    }

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    if (dateOnlyMatch) {
      const [, yearRaw, monthRaw, dayRaw] = dateOnlyMatch;
      const year = Number.parseInt(yearRaw, 10);
      const month = Number.parseInt(monthRaw, 10);
      const day = Number.parseInt(dayRaw, 10);

      const parsed = new Date(
        boundary === "end"
          ? Date.UTC(year, month - 1, day, 23, 59, 59, 999)
          : Date.UTC(year, month - 1, day, 0, 0, 0, 0),
      );

      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        throw new AppError("Invalid date in filters", 422, "DASHBOARD_FILTER_INVALID_DATE");
      }

      return parsed;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError("Invalid date in filters", 422, "DASHBOARD_FILTER_INVALID_DATE");
    }

    return parsed;
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.repository.findCategoryByIdAndUser(categoryId, userId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
  }
}
