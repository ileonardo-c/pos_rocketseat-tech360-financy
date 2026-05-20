import { useAuth } from "@/lib/auth/auth-provider";
import {
  DASHBOARD_CATEGORIES_QUERY,
  DASHBOARD_TRANSACTIONS_QUERY,
  DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY,
  DASHBOARD_TRANSACTION_SUMMARY_QUERY,
  DASHBOARD_TRANSACTION_TIMELINE_QUERY,
} from "@/lib/graphql/operations";
import { useQuery } from "@apollo/client";
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
  const isSyncingFromUrlRef = useRef(false);

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
    variables: {
      filter: {
        from: summaryFilter.from || null,
        to: summaryFilter.to || null,
      },
      interval: timelineInterval,
    },
  });

  if (!user) {
    return <div>Fazendo autenticação...</div>;
  }

  const categories = categoriesData?.categories ?? [];
  const transactions = transactionsData?.transactions ?? [];
  const isInitialLoading =
    (categoriesLoading && categoriesData === undefined) ||
    (transactionsLoading && transactionsData === undefined) ||
    (summaryLoading && summaryData === undefined) ||
    (categorySummaryLoading && categorySummaryData === undefined) ||
    (timelineLoading && timelineData === undefined);

  const summary = summaryData?.transactionSummary ?? {
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0,
    totalCount: 0,
    byType: [],
  };
  const categorySummary = categorySummaryData?.transactionCategorySummary ?? [];
  const timelinePoints = timelineData?.transactionTimeline ?? [];
  const totalCategoryVolume = useMemo(
    () => categorySummary.reduce((accumulator, category) => accumulator + category.total, 0),
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

  if (isInitialLoading) {
    return (
      <main className="dashboard">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Bem-vindo, {user.name}</p>
          </div>
        </header>
        <p>Carregando visão consolidada...</p>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bem-vindo, {user.name}</p>
        </div>
        <div className="page-actions">
          <button
            disabled={isRefreshing}
            type="button"
            onClick={async () => {
              setRefreshError(null);
              const results = await Promise.allSettled([
                refetchCategories(),
                refetchTransactions(),
                refetchSummary(),
                refetchCategorySummary(),
                refetchTimeline(),
              ]);
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
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <button onClick={signout} type="button">
            Sair
          </button>
        </div>
      </header>

      <nav className="dashboard-links">
        <Link to="/categories">Gerenciar categorias</Link>
        <Link to="/transactions">Gerenciar transações</Link>
      </nav>

      {categoriesError || transactionsError || summaryError || categorySummaryError || timelineError ? (
        <p>Não foi possível carregar todas as informações do dashboard.</p>
      ) : null}
      {refreshError ? <p>{refreshError}</p> : null}

      <section className="dashboard-summary-filters">
        <h2>Resumo por período</h2>
        <div className="dashboard-summary-filter-grid">
          <label>
            De
            <input
              type="date"
              value={summaryFilter.from}
              onChange={(event) =>
                setSummaryFilter((previous) => ({
                  ...previous,
                  from: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={summaryFilter.to}
              onChange={(event) =>
                setSummaryFilter((previous) => ({
                  ...previous,
                  to: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <div className="dashboard-summary-filter-actions">
          <button type="button" onClick={() => setSummaryFilter(getCurrentMonthFilter())}>
            Mês atual
          </button>
          <button
            type="button"
            onClick={() => setSummaryFilter(getAllPeriodFilterFromTransactions(transactions))}
          >
            Todo período
          </button>
          <button
            type="button"
            onClick={() => {
              setSummaryFilter(getCurrentMonthFilter());
              setTimelineInterval("DAY");
            }}
          >
            Restaurar padrão
          </button>
        </div>
      </section>

      <section className="dashboard-cards">
        <article className="dashboard-card">
          <h2>Saldo atual</h2>
          <p>{currencyFormatter.format(summary.balance)}</p>
          <Link
            className="dashboard-card-link"
            to={buildTransactionsPath({
              from: summaryFilter.from,
              to: summaryFilter.to,
            })}
          >
            Ver no extrato
          </Link>
        </article>
        <article className="dashboard-card">
          <h2>Receitas</h2>
          <p>{currencyFormatter.format(summary.incomeTotal)}</p>
          <Link
            className="dashboard-card-link"
            to={buildTransactionsPath({
              type: "INCOME",
              from: summaryFilter.from,
              to: summaryFilter.to,
            })}
          >
            Ver receitas
          </Link>
        </article>
        <article className="dashboard-card">
          <h2>Despesas</h2>
          <p>{currencyFormatter.format(summary.expenseTotal)}</p>
          <Link
            className="dashboard-card-link"
            to={buildTransactionsPath({
              type: "EXPENSE",
              from: summaryFilter.from,
              to: summaryFilter.to,
            })}
          >
            Ver despesas
          </Link>
        </article>
        <article className="dashboard-card">
          <h2>Transações</h2>
          <p>{summary.totalCount}</p>
          <Link
            className="dashboard-card-link"
            to={buildTransactionsPath({
              from: summaryFilter.from,
              to: summaryFilter.to,
            })}
          >
            Ver todas
          </Link>
        </article>
        <article className="dashboard-card">
          <h2>Categorias</h2>
          <p>{categories.length}</p>
          <Link className="dashboard-card-link" to="/categories">
            Abrir categorias
          </Link>
        </article>
      </section>

      <section className="dashboard-type-breakdown">
        <h2>Distribuição por tipo</h2>
        <ul>
          {summary.byType.map((item) => (
            <li key={item.type}>
              <strong>{item.type === "INCOME" ? "Receitas" : "Despesas"}</strong>
              <span>{item.count} lançamento(s)</span>
              <span>{currencyFormatter.format(item.total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-timeline">
        <header className="dashboard-timeline-header">
          <h2>Evolução financeira</h2>
          <div className="dashboard-timeline-interval">
            <button
              className={timelineInterval === "DAY" ? "is-active" : ""}
              type="button"
              onClick={() => setTimelineInterval("DAY")}
            >
              Diário
            </button>
            <button
              className={timelineInterval === "MONTH" ? "is-active" : ""}
              type="button"
              onClick={() => setTimelineInterval("MONTH")}
            >
              Mensal
            </button>
          </div>
        </header>
        {timelinePoints.length === 0 ? (
          <p>Sem dados para o período selecionado.</p>
        ) : (
          <div className="dashboard-timeline-table-wrap">
            <table className="dashboard-timeline-table">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Receitas</th>
                  <th>Despesas</th>
                  <th>Saldo</th>
                  <th>Saldo acumulado</th>
                  <th>Lançamentos</th>
                </tr>
              </thead>
              <tbody>
                {timelinePoints.map((point) => (
                  <tr key={point.period}>
                    <td>{point.period}</td>
                    <td>{currencyFormatter.format(point.incomeTotal)}</td>
                    <td>{currencyFormatter.format(point.expenseTotal)}</td>
                    <td>{currencyFormatter.format(point.balance)}</td>
                    <td>{currencyFormatter.format(point.cumulativeBalance)}</td>
                    <td>{point.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-category-ranking">
        <h2>Top categorias no período</h2>
        {categorySummary.length === 0 ? (
          <p>Sem movimentações no período selecionado.</p>
        ) : (
          <ul>
            {categorySummary.map((category) => {
              const percentage =
                totalCategoryVolume > 0 ? (category.total / totalCategoryVolume) * 100 : 0;

              return (
                <li key={category.categoryId}>
                  <div className="dashboard-category-ranking-header">
                    <strong>{category.categoryName}</strong>
                    <span>{currencyFormatter.format(category.total)}</span>
                  </div>
                  <div className="dashboard-category-ranking-meta">
                    <span>{category.count} lançamento(s)</span>
                    <span>Saldo: {currencyFormatter.format(category.balance)}</span>
                  </div>
                  <Link
                    className="dashboard-recent-link"
                    to={buildTransactionsPath({
                      categoryId: category.categoryId,
                      from: summaryFilter.from,
                      to: summaryFilter.to,
                    })}
                  >
                    Ver transações da categoria
                  </Link>
                  <div
                    aria-hidden="true"
                    className="dashboard-category-ranking-bar"
                    style={{ width: `${Math.max(percentage, 4)}%` }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="dashboard-recent">
        <h2>Últimas transações</h2>
        {latestTransactions.length === 0 ? (
          <p>Nenhuma transação cadastrada até o momento.</p>
        ) : (
          <ul>
            {latestTransactions.map((transaction) => (
              <li key={transaction.id}>
                <div>
                  <strong>{transaction.title}</strong>
                  <p>{transaction.category?.name ?? "Sem categoria"}</p>
                </div>
                <div>
                  <p>{transaction.type === "INCOME" ? "Receita" : "Despesa"}</p>
                  <p>{new Date(transaction.date).toLocaleDateString("pt-BR")}</p>
                </div>
                <strong>{currencyFormatter.format(transaction.amount)}</strong>
                <Link
                  className="dashboard-recent-link"
                  to={buildTransactionsPath({
                    categoryId: transaction.category?.id,
                    from: toDateInput(new Date(transaction.date)),
                    to: toDateInput(new Date(transaction.date)),
                  })}
                >
                  Ver no extrato
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
