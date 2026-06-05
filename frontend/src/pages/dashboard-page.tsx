import {
  IconBriefcaseBusiness,
  IconCarFront,
  IconCircleArrowDown,
  IconCircleArrowUp,
  IconPiggyBank,
  IconPlus,
  IconShoppingCart,
  IconUtensils,
  IconWallet,
} from "@/assets/icons";
import { CreateTransactionModal } from "@/components/create-transaction-modal";
import { Button } from "@/components/ui/button";
import { CategoryRow } from "@/components/ui/category-row";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { ErrorBanner } from "@/components/ui/feedback";
import { SectionShell } from "@/components/ui/section-shell";
import { SummaryCard } from "@/components/ui/summary-card";
import { TransactionRow } from "@/components/ui/transaction-row";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  DASHBOARD_RECENT_TRANSACTIONS_QUERY,
  DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY,
  DASHBOARD_TRANSACTION_SUMMARY_QUERY,
  TRANSACTIONS_INITIAL_PERIOD_QUERY,
} from "@/lib/graphql/operations";
import { useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  category: { id: string; name: string } | null;
};

type DashboardSummaryNode = {
  transactionSummary: {
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
  };
};

type DashboardCategorySummaryNode = {
  transactionCategorySummary: Array<{
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
  }>;
};

type DashboardRecentTransactionsNode = {
  dashboardRecentTransactions: Transaction[];
};

type TransactionsInitialPeriodNode = {
  transactionsInitialPeriod: {
    from: string;
    to: string;
    source: "LATEST_TRANSACTION" | "CURRENT_MONTH";
  };
};

type SummaryFilter = {
  from: string;
  to: string;
};

const apiUnavailableEventName = "financy:api-unavailable";
const apiRecoveredEventName = "financy:api-recovered";

type CategoryVariant = "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const parseISODate = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parseFilterFromSearchParams = (searchParams: URLSearchParams): SummaryFilter | null => {
  const from = parseISODate(searchParams.get("from"));
  const to = parseISODate(searchParams.get("to"));

  if (!from || !to || from.getTime() > to.getTime()) {
    return null;
  }

  return {
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  };
};

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const getCategoryVariantByName = (name: string): CategoryVariant => {
  const normalized = normalizeText(name);

  if (normalized.includes("aliment")) return "blue";
  if (normalized.includes("transporte")) return "purple";
  if (normalized.includes("mercado")) return "orange";
  if (normalized.includes("entreten")) return "pink";
  if (normalized.includes("utilidade")) return "yellow";
  if (normalized.includes("invest")) return "green";
  if (normalized.includes("salario") || normalized.includes("receita")) return "green";
  return "gray";
};

const getTransactionLeadingIcon = (transaction: Transaction) => {
  const normalizedTitle = normalizeText(transaction.title);
  const normalizedCategory = normalizeText(transaction.category?.name ?? "");

  if (normalizedTitle.includes("salario")) {
    return <IconBriefcaseBusiness className="h-4 w-4 text-[#16a34a]" />;
  }

  if (normalizedTitle.includes("invest")) {
    return <IconPiggyBank className="h-4 w-4 text-[#16a34a]" />;
  }

  if (normalizedCategory.includes("aliment")) {
    return <IconUtensils className="h-4 w-4 text-[#2563eb]" />;
  }

  if (normalizedCategory.includes("transporte")) {
    return <IconCarFront className="h-4 w-4 text-[#9333ea]" />;
  }

  if (normalizedCategory.includes("mercado")) {
    return <IconShoppingCart className="h-4 w-4 text-[#ea580c]" />;
  }

  return <IconWallet className="h-4 w-4 text-financy-muted" />;
};

const getTransactionLeadingBackground = (transaction: Transaction) => {
  const normalizedTitle = normalizeText(transaction.title);
  const normalizedCategory = normalizeText(transaction.category?.name ?? "");

  if (normalizedTitle.includes("salario") || normalizedTitle.includes("invest"))
    return "bg-financy-tag-green-bg";
  if (normalizedCategory.includes("aliment")) return "bg-financy-tag-blue-bg";
  if (normalizedCategory.includes("transporte")) return "bg-financy-tag-purple-bg";
  if (normalizedCategory.includes("mercado")) return "bg-financy-tag-orange-bg";
  if (normalizedCategory.includes("entreten")) return "bg-financy-tag-pink-bg";
  if (normalizedCategory.includes("utilidade")) return "bg-financy-tag-yellow-bg";
  return "bg-financy-surface-soft";
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const parsedFilterFromSearch = parseFilterFromSearchParams(searchParams);
  const hasValidSearchFilter = Boolean(parsedFilterFromSearch);
  const [resolvedFilter, setResolvedFilter] = useState<SummaryFilter | null>(
    () => parsedFilterFromSearch,
  );

  const {
    data: initialPeriodData,
    loading: initialPeriodLoading,
    error: initialPeriodError,
    refetch: refetchInitialPeriod,
  } = useQuery<TransactionsInitialPeriodNode>(TRANSACTIONS_INITIAL_PERIOD_QUERY, {
    skip: hasValidSearchFilter,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (parsedFilterFromSearch) {
      setResolvedFilter(parsedFilterFromSearch);
      return;
    }

    setResolvedFilter(null);
  }, [parsedFilterFromSearch?.from, parsedFilterFromSearch?.to]);

  useEffect(() => {
    if (hasValidSearchFilter || !initialPeriodData) {
      return;
    }

    const { from, to } = initialPeriodData.transactionsInitialPeriod;
    const fromDate = parseISODate(from);
    const toDate = parseISODate(to);
    if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
      return;
    }

    setResolvedFilter({ from, to });
  }, [hasValidSearchFilter, initialPeriodData]);

  const filter = parsedFilterFromSearch ?? resolvedFilter;

  useEffect(() => {
    if (hasValidSearchFilter || !filter) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("from", filter.from);
    next.set("to", filter.to);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [filter?.from, filter?.to, hasValidSearchFilter, searchParams, setSearchParams]);

  const {
    data: summaryData,
    loading: summaryLoading,
    error: summaryError,
  } = useQuery<DashboardSummaryNode>(DASHBOARD_TRANSACTION_SUMMARY_QUERY, {
    variables: { filter },
    skip: !filter,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: categorySummaryData,
    loading: categorySummaryLoading,
    error: categorySummaryError,
  } = useQuery<DashboardCategorySummaryNode>(DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY, {
    variables: { filter, limit: 5 },
    skip: !filter,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: recentTransactionsData,
    loading: recentTransactionsLoading,
    error: recentTransactionsError,
  } = useQuery<DashboardRecentTransactionsNode>(DASHBOARD_RECENT_TRANSACTIONS_QUERY, {
    variables: { filter, limit: 5 },
    skip: !filter,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    const onApiUnavailable = () => {
      setApiUnavailable(true);
    };
    const onApiRecovered = () => {
      setApiUnavailable(false);
    };

    window.addEventListener(apiUnavailableEventName, onApiUnavailable);
    window.addEventListener(apiRecoveredEventName, onApiRecovered);

    return () => {
      window.removeEventListener(apiUnavailableEventName, onApiUnavailable);
      window.removeEventListener(apiRecoveredEventName, onApiRecovered);
    };
  }, []);

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  const summary = summaryData?.transactionSummary ?? {
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0,
  };
  const recentTransactions = recentTransactionsData?.dashboardRecentTransactions ?? [];
  const categorySummary = categorySummaryData?.transactionCategorySummary ?? [];
  const transactionsLink = filter
    ? `/transactions?from=${filter.from}&to=${filter.to}`
    : "/transactions";

  const isBootstrapLoading = !hasValidSearchFilter && !filter && initialPeriodLoading;
  const isBootstrapError = !hasValidSearchFilter && !filter && Boolean(initialPeriodError);

  const isInitialLoading =
    isBootstrapLoading ||
    (summaryLoading && summaryData === undefined) ||
    (categorySummaryLoading && categorySummaryData === undefined) ||
    (recentTransactionsLoading && recentTransactionsData === undefined);

  const showGlobalDashboardError = Boolean(
    summaryError && categorySummaryError && recentTransactionsError,
  );

  return (
    <main className="min-h-screen bg-financy-page">
      <DashboardNav />

      <section className="mx-auto w-full max-w-[1184px] px-4 py-12 sm:px-6">
        <ErrorBanner
          message={
            isBootstrapError ? "Não foi possível carregar o período inicial do dashboard." : null
          }
          action={
            isBootstrapError ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  void refetchInitialPeriod();
                }}
              >
                Tentar novamente
              </Button>
            ) : undefined
          }
        />
        <ErrorBanner
          message={
            showGlobalDashboardError ? "Não foi possível carregar os dados do dashboard." : null
          }
        />
        <ErrorBanner
          message={
            apiUnavailable
              ? "Serviço temporariamente indisponível. Atualize para tentar novamente."
              : null
          }
        />

        {isInitialLoading ? (
          <div className="rounded-xl border border-financy-border bg-financy-surface p-6">
            <p className="text-sm text-financy-muted">Carregando dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-[378.667px_378.667px_378.667px]">
              <SummaryCard
                icon={<IconWallet className="h-5 w-5 text-[#9333ea]" />}
                label="Saldo total"
                value={currencyFormatter.format(summary.balance)}
              />
              <SummaryCard
                icon={<IconCircleArrowUp className="h-5 w-5 text-financy-success" />}
                label="Receitas do mês"
                value={currencyFormatter.format(summary.incomeTotal)}
              />
              <SummaryCard
                icon={<IconCircleArrowDown className="h-5 w-5 text-financy-danger" />}
                label="Despesas do mês"
                value={currencyFormatter.format(summary.expenseTotal)}
              />
            </div>

            <div className="mt-6 grid items-start gap-4 sm:gap-6 xl:grid-cols-[781.333px_378.667px]">
              <SectionShell
                dataTestId="dashboard-transactions-section"
                bodyElement="ul"
                bodySpacing="none"
                bodyClassName=""
                className="xl:h-[523px]"
                footerIcon={<IconPlus className="h-5 w-5" />}
                footerLabel="Nova transação"
                footerOnClick={() => {
                  if (!filter) {
                    return;
                  }
                  setIsNewTransactionModalOpen(true);
                }}
                linkLabel="Ver todas"
                linkTo={transactionsLink}
                title="Transações recentes"
              >
                {recentTransactions.map((transaction) => {
                  const tagVariant =
                    transaction.type === "INCOME"
                      ? "green"
                      : getCategoryVariantByName(transaction.category?.name ?? "Sem categoria");
                  const isIncome = transaction.type === "INCOME";

                  return (
                    <TransactionRow
                      key={transaction.id}
                      amountLabel={`${isIncome ? "+" : "-"} ${currencyFormatter.format(transaction.amount)}`}
                      categoryLabel={
                        transaction.type === "INCOME"
                          ? normalizeText(transaction.title).includes("invest")
                            ? "Investimento"
                            : "Receita"
                          : (transaction.category?.name ?? "Sem categoria")
                      }
                      categoryVariant={tagVariant}
                      date={new Date(transaction.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        timeZone: "UTC",
                      })}
                      leadingIcon={getTransactionLeadingIcon(transaction)}
                      leadingIconBgClassName={getTransactionLeadingBackground(transaction)}
                      title={transaction.title}
                      type={transaction.type}
                    />
                  );
                })}

                {recentTransactions.length === 0 ? (
                  <li className="flex h-20 items-center border-b border-financy-border px-6 text-sm text-financy-muted last:border-b-0">
                    {recentTransactionsError
                      ? "Não foi possível carregar transações recentes."
                      : "Sem transações no período selecionado."}
                  </li>
                ) : null}
              </SectionShell>

              <SectionShell
                bodyElement="ul"
                bodySpacing="comfortable"
                bodyClassName="space-y-5"
                className="xl:h-[331px]"
                linkLabel="Gerenciar"
                linkTo="/categories"
                title="Categorias"
              >
                {categorySummary.map((item) => (
                  <CategoryRow
                    key={item.categoryId}
                    itemsLabel={`${item.count} itens`}
                    label={item.categoryName}
                    totalLabel={currencyFormatter.format(item.total)}
                    variant={getCategoryVariantByName(item.categoryName)}
                  />
                ))}

                {categorySummary.length === 0 ? (
                  <li className="text-sm text-financy-muted">
                    {categorySummaryError
                      ? "Não foi possível carregar categorias."
                      : "Sem categorias no período selecionado."}
                  </li>
                ) : null}
              </SectionShell>
            </div>
          </>
        )}
      </section>

      {filter ? (
        <CreateTransactionModal
          filter={filter}
          isOpen={isNewTransactionModalOpen}
          onClose={() => setIsNewTransactionModalOpen(false)}
        />
      ) : null}
    </main>
  );
};
