import { IconCircleArrowDown, IconCircleArrowUp } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  CREATE_TRANSACTION_MUTATION,
  DASHBOARD_CATEGORIES_QUERY,
  DASHBOARD_TRANSACTIONS_QUERY,
  DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY,
  DASHBOARD_TRANSACTION_SUMMARY_QUERY,
  DASHBOARD_TRANSACTION_TIMELINE_QUERY,
} from "@/lib/graphql/operations";
import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type Category = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  category: { id: string; name: string } | null;
};

type CategoriesNode = {
  categories: Category[];
};

type TransactionsNode = {
  transactions: Transaction[];
};

type SummaryFilter = {
  from: string;
  to: string;
};

type TransactionSummaryNode = {
  transactionSummary: {
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
    totalCount: number;
    byType: Array<{
      type: "INCOME" | "EXPENSE";
      total: number;
      count: number;
    }>;
  };
};

type TransactionCategorySummaryNode = {
  transactionCategorySummary: Array<{
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
  }>;
};

type TimelineInterval = "DAY" | "MONTH";

type TransactionForm = {
  title: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  categoryId: string;
};

type TransactionTimelineNode = {
  transactionTimeline: Array<{
    period: string;
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
    cumulativeBalance: number;
    count: number;
  }>;
};

const buildTransactionsPath = (params: {
  query?: string;
  type?: "ALL" | "INCOME" | "EXPENSE";
  categoryId?: string;
  from?: string;
  to?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set("query", params.query);
  }
  if (params.type && params.type !== "ALL") {
    searchParams.set("type", params.type);
  }
  if (params.categoryId) {
    searchParams.set("categoryId", params.categoryId);
  }
  if (params.from) {
    searchParams.set("from", params.from);
  }
  if (params.to) {
    searchParams.set("to", params.to);
  }

  const queryString = searchParams.toString();
  return queryString ? `/transactions?${queryString}` : "/transactions";
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentMonthFilter = (): SummaryFilter => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: toDateInput(firstDayOfMonth),
    to: toDateInput(today),
  };
};

const getAllPeriodFilterFromTransactions = (transactions: Transaction[]): SummaryFilter => {
  const today = toDateInput(new Date());
  if (transactions.length === 0) {
    return { from: "", to: "" };
  }

  const oldest = transactions.reduce((currentOldest, transaction) => {
    return new Date(transaction.date).getTime() < new Date(currentOldest.date).getTime()
      ? transaction
      : currentOldest;
  }, transactions[0]);

  return {
    from: toDateInput(new Date(oldest.date)),
    to: today,
  };
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const isValidDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(year, month - 1, day);

  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day
  );
};

const parseDashboardStateFromSearchParams = (searchParams: URLSearchParams) => {
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const interval = searchParams.get("interval");

  return {
    summaryFilter: {
      from: isValidDateInput(from) ? from : "",
      to: isValidDateInput(to) ? to : "",
    },
    timelineInterval: interval === "MONTH" ? "MONTH" : "DAY",
  } as const;
};

const buildSearchParamsFromDashboardState = (params: {
  summaryFilter: SummaryFilter;
  timelineInterval: TimelineInterval;
}) => {
  const searchParams = new URLSearchParams();

  if (params.summaryFilter.from) {
    searchParams.set("from", params.summaryFilter.from);
  }
  if (params.summaryFilter.to) {
    searchParams.set("to", params.summaryFilter.to);
  }
  if (params.timelineInterval !== "DAY") {
    searchParams.set("interval", params.timelineInterval);
  }

  return searchParams;
};

const isSameSummaryFilter = (left: SummaryFilter, right: SummaryFilter) =>
  left.from === right.from && left.to === right.to;

const isInvalidSummaryRange = (filter: SummaryFilter) =>
  Boolean(filter.from && filter.to && filter.from > filter.to);

const getSummaryFilterInputState = (value: string, hasRangeError: boolean) =>
  hasRangeError && value ? "error" : value ? "filled" : "empty";

const toLocalDateInput = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyTransactionForm: TransactionForm = {
  title: "",
  amount: "",
  type: "EXPENSE",
  date: "",
  categoryId: "",
};

export const ProtectedPage = () => {
  const { user, signout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const parsedState = parseDashboardStateFromSearchParams(searchParams);

  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>(() =>
    parsedState.summaryFilter.from || parsedState.summaryFilter.to
      ? parsedState.summaryFilter
      : getCurrentMonthFilter(),
  );
  const [timelineInterval, setTimelineInterval] = useState<TimelineInterval>(
    parsedState.timelineInterval,
  );
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateDialogClosing, setIsCreateDialogClosing] = useState(false);
  const [form, setForm] = useState<TransactionForm>(emptyTransactionForm);
  const createCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalCloseDurationMs = 150;
  const isSyncingFromUrlRef = useRef(false);
  const hasInvalidSummaryRange = isInvalidSummaryRange(summaryFilter);
  const summaryFilterValidationError = hasInvalidSummaryRange
    ? "Período inválido: a data inicial deve ser menor ou igual à final."
    : null;
  const [createTransaction, { loading: creatingTransaction }] = useMutation(
    CREATE_TRANSACTION_MUTATION,
    {
      refetchQueries: [
        { query: DASHBOARD_TRANSACTIONS_QUERY },
        { query: DASHBOARD_TRANSACTION_SUMMARY_QUERY },
        { query: DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY },
        { query: DASHBOARD_TRANSACTION_TIMELINE_QUERY },
      ],
      awaitRefetchQueries: true,
    },
  );

  useEffect(() => {
    const nextParsedState = parseDashboardStateFromSearchParams(searchParams);
    const nextSummaryFilter =
      !nextParsedState.summaryFilter.from && !nextParsedState.summaryFilter.to
        ? getCurrentMonthFilter()
        : nextParsedState.summaryFilter;
    const hasStateChangeFromUrl =
      !isSameSummaryFilter(summaryFilter, nextSummaryFilter) ||
      timelineInterval !== nextParsedState.timelineInterval;

    setSummaryFilter((current) => {
      if (isSameSummaryFilter(current, nextSummaryFilter)) {
        return current;
      }
      return nextSummaryFilter;
    });

    setTimelineInterval((current) => {
      if (current === nextParsedState.timelineInterval) {
        return current;
      }
      return nextParsedState.timelineInterval;
    });

    if (hasStateChangeFromUrl) {
      isSyncingFromUrlRef.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (isSyncingFromUrlRef.current) {
      isSyncingFromUrlRef.current = false;
      return;
    }

    const nextSearchParams = buildSearchParamsFromDashboardState({
      summaryFilter,
      timelineInterval,
    });

    const next = nextSearchParams.toString();
    if (next !== searchParamsString) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [searchParamsString, setSearchParams, summaryFilter, timelineInterval]);

  useEffect(
    () => () => {
      if (createCloseTimeoutRef.current) {
        clearTimeout(createCloseTimeoutRef.current);
      }
    },
    [],
  );

  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery<CategoriesNode>(DASHBOARD_CATEGORIES_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });
  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery<TransactionsNode>(DASHBOARD_TRANSACTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });
  const {
    data: summaryData,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery<TransactionSummaryNode>(DASHBOARD_TRANSACTION_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
    skip: hasInvalidSummaryRange,
    variables: {
      filter: {
        from: summaryFilter.from || null,
        to: summaryFilter.to || null,
      },
    },
  });
  const {
    data: categorySummaryData,
    loading: categorySummaryLoading,
    error: categorySummaryError,
    refetch: refetchCategorySummary,
  } = useQuery<TransactionCategorySummaryNode>(DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
    skip: hasInvalidSummaryRange,
    variables: {
      filter: {
        from: summaryFilter.from || null,
        to: summaryFilter.to || null,
      },
      limit: 5,
    },
  });
  const {
    data: timelineData,
    loading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useQuery<TransactionTimelineNode>(DASHBOARD_TRANSACTION_TIMELINE_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
    skip: hasInvalidSummaryRange,
    variables: {
      filter: {
        from: summaryFilter.from || null,
        to: summaryFilter.to || null,
      },
      interval: timelineInterval,
    },
  });

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-financy-page px-4">
        <Card className="w-full max-w-md border-financy-border bg-financy-surface p-6 shadow-panel">
          <p className="font-jakarta text-sm font-semibold uppercase tracking-[0.16em] text-financy-muted">
            Financy
          </p>
          <h1 className="mt-3 font-jakarta text-2xl font-semibold text-financy-text">
            Fazendo autenticação
          </h1>
          <p className="mt-2 text-sm text-financy-muted">
            Validando token de acesso para liberar o dashboard.
          </p>
        </Card>
      </main>
    );
  }

  const categories = categoriesData?.categories ?? [];
  const transactions = transactionsData?.transactions ?? [];
  const isInitialLoading =
    (categoriesLoading && categoriesData === undefined) ||
    (transactionsLoading && transactionsData === undefined) ||
    (summaryLoading && summaryData === undefined) ||
    (categorySummaryLoading && categorySummaryData === undefined) ||
    (timelineLoading && timelineData === undefined);

  const summary = summaryData?.transactionSummary;
  const categorySummary = categorySummaryData?.transactionCategorySummary;
  const timelinePoints = timelineData?.transactionTimeline;
  const hasCriticalSummaryFailure =
    !hasInvalidSummaryRange &&
    ((summaryError && !summary) ||
      (categorySummaryError && !categorySummary) ||
      (timelineError && !timelinePoints));
  const totalCategoryVolume = useMemo(
    () =>
      (categorySummary ?? []).reduce((accumulator, category) => accumulator + category.total, 0),
    [categorySummary],
  );

  const latestTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
  const isRefreshing =
    !isInitialLoading &&
    (categoriesLoading ||
      transactionsLoading ||
      summaryLoading ||
      categorySummaryLoading ||
      timelineLoading);

  const openCreateDialog = () => {
    if (createCloseTimeoutRef.current) {
      clearTimeout(createCloseTimeoutRef.current);
      createCloseTimeoutRef.current = null;
    }
    setIsCreateDialogClosing(false);
    setForm((previous) => ({
      ...emptyTransactionForm,
      date: previous.date || toLocalDateInput(new Date()),
    }));
    setActionError(null);
    setActionSuccess(null);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (!isCreateDialogOpen) {
      return;
    }
    setIsCreateDialogClosing(true);
    if (createCloseTimeoutRef.current) {
      clearTimeout(createCloseTimeoutRef.current);
    }
    createCloseTimeoutRef.current = setTimeout(() => {
      setIsCreateDialogOpen(false);
      setIsCreateDialogClosing(false);
      createCloseTimeoutRef.current = null;
    }, modalCloseDurationMs);
  };

  const isCreateDisabled =
    creatingTransaction ||
    !form.title.trim() ||
    !form.amount ||
    !form.date ||
    !form.categoryId ||
    categories.length === 0;

  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-financy-page px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Card className="border-financy-border bg-financy-surface p-6 shadow-panel">
            <p className="font-jakarta text-sm font-semibold uppercase tracking-[0.16em] text-financy-muted">
              Visão Geral
            </p>
            <h1 className="mt-2 font-jakarta text-3xl font-semibold text-financy-text">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-financy-muted">Bem-vindo, {user.name}</p>
          </Card>
          <Card className="border-financy-border bg-financy-surface p-5">
            <p className="text-sm text-financy-muted">Carregando visão consolidada...</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-financy-page px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="border-financy-border bg-financy-surface p-6 shadow-panel">
          <p className="font-jakarta text-sm font-semibold uppercase tracking-[0.16em] text-financy-muted">
            Visão Geral
          </p>
          <h1 className="mt-2 font-jakarta text-3xl font-semibold text-financy-text">Dashboard</h1>
          <p className="mt-1 text-sm text-financy-muted">Bem-vindo, {user.name}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isRefreshing}
              type="button"
              onClick={async () => {
                setRefreshError(null);
                const refreshTasks: Array<Promise<unknown>> = [
                  refetchCategories(),
                  refetchTransactions(),
                ];

                if (!hasInvalidSummaryRange) {
                  refreshTasks.push(refetchSummary(), refetchCategorySummary(), refetchTimeline());
                }

                const results = await Promise.allSettled(refreshTasks);
                const failedCount = results.filter((result) => result.status === "rejected").length;

                if (failedCount === results.length) {
                  setRefreshError("Não foi possível atualizar os dados do dashboard.");
                  return;
                }

                if (failedCount > 0) {
                  setRefreshError(
                    "Alguns dados do dashboard não foram atualizados. Tente novamente em instantes.",
                  );
                }
              }}
            >
              <span className="t-text-swap">{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
            </Button>
            <Button onClick={signout} type="button" variant="ghost">
              Sair
            </Button>
            <Button disabled={categories.length === 0} type="button" onClick={openCreateDialog}>
              Nova transação
            </Button>
          </div>
        </Card>

        <Card className="border-financy-border bg-financy-surface p-4">
          <nav className="grid gap-2 sm:grid-cols-3">
            <Link className="inline-flex" to="/categories">
              <TextLink>Gerenciar categorias</TextLink>
            </Link>
            <Link className="inline-flex" to="/transactions">
              <TextLink>Gerenciar transações</TextLink>
            </Link>
            <Link className="inline-flex" to="/profile">
              <TextLink>Meu perfil</TextLink>
            </Link>
          </nav>
        </Card>

        <ErrorBanner
          message={
            categoriesError || transactionsError || hasCriticalSummaryFailure
              ? "Não foi possível carregar todas as informações do dashboard."
              : null
          }
        />
        <ErrorBanner message={refreshError} />
        <ErrorBanner message={actionError} />
        <SuccessBanner message={actionSuccess} />
        <ErrorBanner message={summaryFilterValidationError} />

        <Card className="border-financy-border bg-financy-surface p-5">
          <h2 className="font-jakarta text-lg font-semibold text-financy-text">
            Resumo por período
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label="De"
              type="date"
              helper={
                summaryFilterValidationError && summaryFilter.from
                  ? summaryFilterValidationError
                  : undefined
              }
              helperError={Boolean(summaryFilterValidationError && summaryFilter.from)}
              state={getSummaryFilterInputState(
                summaryFilter.from,
                Boolean(summaryFilterValidationError),
              )}
              value={summaryFilter.from}
              onChange={(event) =>
                setSummaryFilter((previous) => ({
                  ...previous,
                  from: event.target.value,
                }))
              }
            />
            <Input
              label="Até"
              type="date"
              helper={
                summaryFilterValidationError && summaryFilter.to
                  ? summaryFilterValidationError
                  : undefined
              }
              helperError={Boolean(summaryFilterValidationError && summaryFilter.to)}
              state={getSummaryFilterInputState(
                summaryFilter.to,
                Boolean(summaryFilterValidationError),
              )}
              value={summaryFilter.to}
              onChange={(event) =>
                setSummaryFilter((previous) => ({
                  ...previous,
                  to: event.target.value,
                }))
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setSummaryFilter(getCurrentMonthFilter())}
            >
              Mês atual
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setSummaryFilter(getAllPeriodFilterFromTransactions(transactions))}
            >
              Todo período
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setSummaryFilter(getCurrentMonthFilter());
                setTimelineInterval("DAY");
              }}
            >
              Restaurar padrão
            </Button>
          </div>
        </Card>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-financy-border bg-financy-surface p-5">
            <h2 className="text-sm font-semibold text-financy-muted">Saldo atual</h2>
            <p className="mt-2 text-2xl font-semibold text-financy-text">
              {summary ? currencyFormatter.format(summary.balance) : "--"}
            </p>
            <Link
              className="mt-3 inline-flex"
              to={buildTransactionsPath({
                from: summaryFilter.from,
                to: summaryFilter.to,
              })}
            >
              <TextLink>Ver no extrato</TextLink>
            </Link>
          </Card>
          <Card className="border-financy-border bg-financy-surface p-5">
            <h2 className="text-sm font-semibold text-financy-muted">Receitas</h2>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-financy-success">
              <IconCircleArrowUp className="h-4 w-4" />
              {summary ? currencyFormatter.format(summary.incomeTotal) : "--"}
            </p>
            <Link
              className="mt-3 inline-flex"
              to={buildTransactionsPath({
                type: "INCOME",
                from: summaryFilter.from,
                to: summaryFilter.to,
              })}
            >
              <TextLink>Ver receitas</TextLink>
            </Link>
          </Card>
          <Card className="border-financy-border bg-financy-surface p-5">
            <h2 className="text-sm font-semibold text-financy-muted">Despesas</h2>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-financy-danger">
              <IconCircleArrowDown className="h-4 w-4" />
              {summary ? currencyFormatter.format(summary.expenseTotal) : "--"}
            </p>
            <Link
              className="mt-3 inline-flex"
              to={buildTransactionsPath({
                type: "EXPENSE",
                from: summaryFilter.from,
                to: summaryFilter.to,
              })}
            >
              <TextLink>Ver despesas</TextLink>
            </Link>
          </Card>
          <Card className="border-financy-border bg-financy-surface p-5">
            <h2 className="text-sm font-semibold text-financy-muted">Transações</h2>
            <p className="mt-2 text-2xl font-semibold text-financy-text">
              {summary?.totalCount ?? "--"}
            </p>
            <Link
              className="mt-3 inline-flex"
              to={buildTransactionsPath({
                from: summaryFilter.from,
                to: summaryFilter.to,
              })}
            >
              <TextLink>Ver todas</TextLink>
            </Link>
          </Card>
          <Card className="border-financy-border bg-financy-surface p-5">
            <h2 className="text-sm font-semibold text-financy-muted">Categorias</h2>
            <p className="mt-2 text-2xl font-semibold text-financy-text">{categories.length}</p>
            <Link className="mt-3 inline-flex" to="/categories">
              <TextLink>Abrir categorias</TextLink>
            </Link>
          </Card>
        </section>

        <Card className="border-financy-border bg-financy-surface p-5">
          <h2 className="font-jakarta text-lg font-semibold text-financy-text">
            Distribuição por tipo
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(summary?.byType ?? []).map((item) => (
              <li
                key={item.type}
                className="rounded-xl border border-financy-border bg-financy-surface-soft p-4"
              >
                <strong className="text-sm text-financy-text">
                  {item.type === "INCOME" ? "Receitas" : "Despesas"}
                </strong>
                <p className="mt-1 text-xs text-financy-muted">{item.count} lançamento(s)</p>
                <p className="mt-2 text-lg font-semibold text-financy-text">
                  {currencyFormatter.format(item.total)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-financy-border bg-financy-surface p-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-jakarta text-lg font-semibold text-financy-text">
              Evolução financeira
            </h2>
            <div className="flex items-center gap-2">
              <Button
                className={timelineInterval === "DAY" ? "ring-2 ring-financy-primary/40" : ""}
                size="sm"
                type="button"
                variant={timelineInterval === "DAY" ? "primary" : "outline"}
                onClick={() => setTimelineInterval("DAY")}
              >
                Diário
              </Button>
              <Button
                className={timelineInterval === "MONTH" ? "ring-2 ring-financy-primary/40" : ""}
                size="sm"
                type="button"
                variant={timelineInterval === "MONTH" ? "primary" : "outline"}
                onClick={() => setTimelineInterval("MONTH")}
              >
                Mensal
              </Button>
            </div>
          </header>
          {!timelinePoints || timelinePoints.length === 0 ? (
            <p className="mt-4 text-sm text-financy-muted">Sem dados para o período selecionado.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-financy-border">
              <table className="min-w-full divide-y divide-financy-border text-sm">
                <thead>
                  <tr className="bg-financy-surface-soft text-left text-xs uppercase tracking-wide text-financy-muted">
                    <th className="px-3 py-2">Período</th>
                    <th className="px-3 py-2">Receitas</th>
                    <th className="px-3 py-2">Despesas</th>
                    <th className="px-3 py-2">Saldo</th>
                    <th className="px-3 py-2">Saldo acumulado</th>
                    <th className="px-3 py-2">Lançamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-financy-border bg-financy-surface">
                  {timelinePoints.map((point) => (
                    <tr key={point.period} className="text-financy-text">
                      <td className="px-3 py-2">{point.period}</td>
                      <td className="px-3 py-2">{currencyFormatter.format(point.incomeTotal)}</td>
                      <td className="px-3 py-2">{currencyFormatter.format(point.expenseTotal)}</td>
                      <td className="px-3 py-2">{currencyFormatter.format(point.balance)}</td>
                      <td className="px-3 py-2">
                        {currencyFormatter.format(point.cumulativeBalance)}
                      </td>
                      <td className="px-3 py-2">{point.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="border-financy-border bg-financy-surface p-5">
          <h2 className="font-jakarta text-lg font-semibold text-financy-text">
            Top categorias no período
          </h2>
          {!categorySummary || categorySummary.length === 0 ? (
            <p className="mt-4 text-sm text-financy-muted">
              Sem movimentações no período selecionado.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {categorySummary.map((category) => {
                const percentage =
                  totalCategoryVolume > 0 ? (category.total / totalCategoryVolume) * 100 : 0;

                return (
                  <li
                    key={category.categoryId}
                    className="rounded-xl border border-financy-border bg-financy-surface-soft p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-financy-text">{category.categoryName}</strong>
                      <span className="text-sm font-semibold text-financy-text">
                        {currencyFormatter.format(category.total)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-financy-muted">
                      <span>{category.count} lançamento(s)</span>
                      <span>Saldo: {currencyFormatter.format(category.balance)}</span>
                    </div>
                    <Link
                      className="mt-2 inline-flex"
                      to={buildTransactionsPath({
                        categoryId: category.categoryId,
                        from: summaryFilter.from,
                        to: summaryFilter.to,
                      })}
                    >
                      <TextLink>Ver transações da categoria</TextLink>
                    </Link>
                    <div
                      aria-hidden="true"
                      className="mt-2 h-2 rounded-full bg-financy-primary"
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="border-financy-border bg-financy-surface p-5">
          <h2 className="font-jakarta text-lg font-semibold text-financy-text">
            Últimas transações
          </h2>
          {latestTransactions.length === 0 ? (
            <p className="mt-4 text-sm text-financy-muted">
              Nenhuma transação cadastrada até o momento.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {latestTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="grid gap-3 rounded-xl border border-financy-border bg-financy-surface-soft p-4 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-financy-text">
                      {transaction.title}
                    </strong>
                    <p className="mt-1 text-xs text-financy-muted">
                      {transaction.category?.name ?? "Sem categoria"}
                    </p>
                  </div>
                  <div className="text-xs text-financy-muted">
                    <p>{transaction.type === "INCOME" ? "Receita" : "Despesa"}</p>
                    <p>{new Date(transaction.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <strong className="text-sm text-financy-text">
                    {currencyFormatter.format(transaction.amount)}
                  </strong>
                  <Link
                    className="inline-flex sm:col-span-3"
                    to={buildTransactionsPath({
                      categoryId: transaction.category?.id,
                      from: toDateInput(new Date(transaction.date)),
                      to: toDateInput(new Date(transaction.date)),
                    })}
                  >
                    <TextLink>Ver no extrato</TextLink>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isCreateDialogOpen ? (
          <Modal
            isOpen={isCreateDialogOpen && !isCreateDialogClosing}
            onClose={closeCreateDialog}
            title="Nova transação"
          >
            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (isCreateDisabled) {
                  return;
                }

                try {
                  setActionError(null);
                  setActionSuccess(null);
                  await createTransaction({
                    variables: {
                      input: {
                        title: form.title.trim(),
                        amount: Number(form.amount),
                        type: form.type,
                        date: new Date(`${form.date}T00:00:00`).toISOString(),
                        categoryId: form.categoryId,
                        description: null,
                      },
                    },
                  });
                  closeCreateDialog();
                  setActionSuccess("Transação criada com sucesso.");
                } catch {
                  setActionError("Não foi possível criar a transação.");
                }
              }}
            >
              <Input
                autoComplete="off"
                label="Título"
                required
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, title: event.target.value }))
                }
              />
              <Input
                label="Valor"
                min="0"
                required
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, amount: event.target.value }))
                }
              />
              <label className="text-sm font-medium text-financy-text" htmlFor="transaction-type">
                Tipo
              </label>
              <Select
                id="transaction-type"
                value={form.type}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    type: event.target.value as TransactionForm["type"],
                  }))
                }
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </Select>
              <Input
                label="Data"
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, date: event.target.value }))
                }
              />
              <label
                className="text-sm font-medium text-financy-text"
                htmlFor="transaction-category"
              >
                Categoria
              </label>
              <Select
                id="transaction-category"
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, categoryId: event.target.value }))
                }
              >
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button disabled={isCreateDisabled} type="submit">
                  <span className="t-text-swap">
                    {creatingTransaction ? "Criando..." : "Criar transação"}
                  </span>
                </Button>
                <Button type="button" variant="outline" onClick={closeCreateDialog}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        ) : null}
      </div>
    </main>
  );
};
