import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconSquarePen,
  IconTrash,
} from "@/assets/icons";
import { CreateTransactionModal } from "@/components/create-transaction-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeading } from "@/components/ui/page-heading";
import { PaginationButton } from "@/components/ui/pagination-button";
import { PeriodSelector } from "@/components/ui/period-selector";
import type { PeriodValue } from "@/components/ui/period-selector";
import { Select } from "@/components/ui/select";
import { TransactionRow } from "@/components/ui/transaction-row";
import {
  CATEGORIES_QUERY,
  DELETE_TRANSACTION_MUTATION,
  TRANSACTIONS_COUNT_QUERY,
  TRANSACTIONS_INITIAL_PERIOD_QUERY,
  TRANSACTIONS_QUERY,
} from "@/lib/graphql/operations";

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type Transaction = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  categoryId: string;
  category: Category | null;
};

type CategoriesNode = {
  categories: Category[];
};

type TransactionsNode = {
  transactions: Transaction[];
};

type TransactionsCountNode = {
  transactionsCount: number;
};

type TransactionsInitialPeriodNode = {
  transactionsInitialPeriod: {
    from: string;
    to: string;
    source: "LATEST_TRANSACTION" | "CURRENT_MONTH";
  };
};

type TransactionFilterType = "ALL" | "INCOME" | "EXPENSE";

type TransactionFilterState = {
  query: string;
  type: TransactionFilterType;
  categoryId: string;
};

const itemsPerPage = 10;

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

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildRangeFromPeriod = (period: PeriodValue) => {
  const normalizedMonth = Math.min(12, Math.max(1, period.month));
  const from = new Date(period.year, normalizedMonth - 1, 1);
  const to = new Date(period.year, normalizedMonth, 0);

  return {
    from: toISODate(from),
    to: toISODate(to),
  };
};

const parsePeriodRangeFromSearch = (searchParams: URLSearchParams) => {
  const from = parseISODate(searchParams.get("from"));
  const to = parseISODate(searchParams.get("to"));
  if (!from || !to) {
    return null;
  }

  if (from.getTime() > to.getTime()) {
    return null;
  }

  return { from, to };
};

const parseFilterType = (value: string | null): TransactionFilterType => {
  if (value === "INCOME" || value === "EXPENSE") {
    return value;
  }

  return "ALL";
};

const parsePage = (value: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type CategoryVariant = "gray" | "blue" | "purple" | "pink" | "red" | "orange" | "yellow" | "green";

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

const getCategoryVariant = (category: Category | null): CategoryVariant => {
  const color = category?.color?.toLowerCase();

  if (
    color === "gray" ||
    color === "blue" ||
    color === "purple" ||
    color === "pink" ||
    color === "red" ||
    color === "orange" ||
    color === "yellow" ||
    color === "green"
  ) {
    return color;
  }

  return getCategoryVariantByName(category?.name ?? "Sem categoria");
};

const getCategoryIconClasses = (
  variant: CategoryVariant,
): { bgClassName: string; iconClassName: string } => {
  if (variant === "blue") {
    return {
      bgClassName: "bg-financy-tag-blue-bg",
      iconClassName: "text-financy-tag-blue-text",
    };
  }
  if (variant === "purple") {
    return {
      bgClassName: "bg-financy-tag-purple-bg",
      iconClassName: "text-financy-tag-purple-text",
    };
  }
  if (variant === "pink") {
    return {
      bgClassName: "bg-financy-tag-pink-bg",
      iconClassName: "text-financy-tag-pink-text",
    };
  }
  if (variant === "red") {
    return {
      bgClassName: "bg-financy-tag-red-bg",
      iconClassName: "text-financy-tag-red-text",
    };
  }
  if (variant === "orange") {
    return {
      bgClassName: "bg-financy-tag-orange-bg",
      iconClassName: "text-financy-tag-orange-text",
    };
  }
  if (variant === "yellow") {
    return {
      bgClassName: "bg-financy-tag-yellow-bg",
      iconClassName: "text-financy-tag-yellow-text",
    };
  }
  if (variant === "green") {
    return {
      bgClassName: "bg-financy-tag-green-bg",
      iconClassName: "text-financy-tag-green-text",
    };
  }

  return {
    bgClassName: "bg-financy-tag-gray-bg",
    iconClassName: "text-financy-tag-gray-text",
  };
};

export const TransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedPeriodRange = parsePeriodRangeFromSearch(searchParams);
  const hasValidSearchPeriod = Boolean(parsedPeriodRange);

  const [filter, setFilter] = useState<TransactionFilterState>(() => ({
    query: searchParams.get("query") ?? "",
    type: parseFilterType(searchParams.get("type")),
    categoryId: searchParams.get("categoryId") ?? "",
  }));
  const [searchInput, setSearchInput] = useState<string>(() => searchParams.get("query") ?? "");
  const [period, setPeriod] = useState<PeriodValue | null>(() => {
    if (!parsedPeriodRange) {
      return null;
    }

    return {
      month: parsedPeriodRange.from.getMonth() + 1,
      year: parsedPeriodRange.from.getFullYear(),
    };
  });
  const [page, setPage] = useState<number>(() => parsePage(searchParams.get("page")));

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    data: initialPeriodData,
    loading: initialPeriodLoading,
    error: initialPeriodError,
    refetch: refetchInitialPeriod,
  } = useQuery<TransactionsInitialPeriodNode>(TRANSACTIONS_INITIAL_PERIOD_QUERY, {
    skip: hasValidSearchPeriod,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (hasValidSearchPeriod || period) {
      return;
    }

    const from = parseISODate(initialPeriodData?.transactionsInitialPeriod?.from ?? null);
    if (from) {
      setPeriod({
        month: from.getMonth() + 1,
        year: from.getFullYear(),
      });
    }
  }, [hasValidSearchPeriod, initialPeriodData, period]);

  const periodRange = useMemo(() => (period ? buildRangeFromPeriod(period) : null), [period]);
  const isPeriodReady = Boolean(periodRange);

  const filterInput = useMemo(
    () => ({
      query: filter.query.trim() || undefined,
      type: filter.type === "ALL" ? undefined : filter.type,
      categoryId: filter.categoryId || undefined,
      from: periodRange?.from,
      to: periodRange?.to,
    }),
    [filter.categoryId, filter.query, filter.type, periodRange?.from, periodRange?.to],
  );

  const queryVariables = useMemo(
    () => ({
      filter: filterInput,
      sort: {
        field: "DATE",
        direction: "DESC",
      },
      page,
      perPage: itemsPerPage,
    }),
    [filterInput, page],
  );

  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (!periodRange) {
      return;
    }

    const next = new URLSearchParams();

    if (filter.query.trim()) {
      next.set("query", filter.query.trim());
    }

    if (filter.type !== "ALL") {
      next.set("type", filter.type);
    }

    if (filter.categoryId) {
      next.set("categoryId", filter.categoryId);
    }

    next.set("from", periodRange.from);
    next.set("to", periodRange.to);

    if (page > 1) {
      next.set("page", String(page));
    }

    if (next.toString() !== searchParamsString) {
      setSearchParams(next, { replace: true });
    }
  }, [filter, page, periodRange?.from, periodRange?.to, searchParamsString, setSearchParams]);

  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
  } = useQuery<CategoriesNode>(CATEGORIES_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery<TransactionsNode>(TRANSACTIONS_QUERY, {
    variables: queryVariables,
    skip: !isPeriodReady,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const { data: transactionsCountData, refetch: refetchTransactionsCount } =
    useQuery<TransactionsCountNode>(TRANSACTIONS_COUNT_QUERY, {
      variables: { filter: filterInput },
      skip: !isPeriodReady,
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    });

  const [deleteTransaction, { loading: deleting }] = useMutation(DELETE_TRANSACTION_MUTATION);

  const categories = categoriesData?.categories ?? [];
  const transactions = transactionsData?.transactions ?? [];
  const totalResults = transactionsCountData?.transactionsCount ?? transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilter((prev) => {
        if (prev.query === searchInput) {
          return prev;
        }

        setPage(1);
        return { ...prev, query: searchInput };
      });
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const isBootstrapLoading = !hasValidSearchPeriod && !isPeriodReady && initialPeriodLoading;
  const isBootstrapError = !hasValidSearchPeriod && !isPeriodReady && Boolean(initialPeriodError);
  const isInitialLoading = isBootstrapLoading || (categoriesLoading && transactionsLoading);

  const openEditDialog = (transaction: Transaction) => {
    setActionError(null);
    setActionSuccess(null);
    setEditingTransaction(transaction);
  };

  const closeEditDialog = () => {
    setEditingTransaction(null);
  };

  const closeDeleteDialog = () => {
    if (deleting) {
      return;
    }
    setDeletingTransaction(null);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!deletingTransaction) {
      return;
    }

    try {
      setActionError(null);
      setActionSuccess(null);
      await deleteTransaction({ variables: { id: deletingTransaction.id } });
      await refetchTransactions();
      await refetchTransactionsCount();
      setActionSuccess("Transação excluída com sucesso.");
      setDeletingTransaction(null);
    } catch {
      setActionError("Não foi possível excluir a transação.");
    }
  };

  const tableRowsFrom = totalResults === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const tableRowsTo = Math.min(page * itemsPerPage, totalResults);

  if (isInitialLoading && categories.length === 0 && transactions.length === 0) {
    return (
      <main className="min-h-screen bg-financy-page">
        <DashboardNav />
        <section className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-6">
          <Card className="border-financy-border p-5">
            <p className="text-sm text-financy-muted">Carregando transações...</p>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-financy-page pb-12">
      <DashboardNav />

      <section className="mx-auto w-full max-w-[1184px] px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeading
            className="flex flex-col gap-0.5"
            title="Transações"
            description="Gerencie todas as suas transações financeiras"
          />

          <Button
            size="sm"
            variant="primary"
            startIcon={<IconPlus className="h-4 w-4" />}
            disabled={!isPeriodReady}
            onClick={() => {
              setActionError(null);
              setActionSuccess(null);
              setIsCreateDialogOpen(true);
            }}
          >
            Nova transação
          </Button>
        </header>

        {isBootstrapError ? (
          <ErrorBanner
            message="Não foi possível carregar o período inicial das transações."
            action={
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
            }
          />
        ) : null}
        <ErrorBanner message={categoriesError ? "Não foi possível carregar categorias." : null} />
        <ErrorBanner message={transactionsError ? "Não foi possível carregar transações." : null} />
        <ErrorBanner message={actionError} />
        <SuccessBanner message={actionSuccess} />

        <Card className="mb-6 border-financy-border p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              label="Buscar"
              type="text"
              placeholder="Buscar por descrição"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              startIcon={<IconSearch className="h-4 w-4" />}
            />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="transactions-filter-type"
                className="text-sm font-medium leading-5 text-financy-text-secondary"
              >
                Tipo
              </label>
              <Select
                id="transactions-filter-type"
                value={filter.type}
                onChange={(event) => {
                  setPage(1);
                  setFilter((prev) => ({
                    ...prev,
                    type: event.target.value as TransactionFilterType,
                  }));
                }}
              >
                <option value="ALL">Todos</option>
                <option value="INCOME">Receitas</option>
                <option value="EXPENSE">Despesas</option>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="transactions-filter-category"
                className="text-sm font-medium leading-5 text-financy-text-secondary"
              >
                Categoria
              </label>
              <Select
                id="transactions-filter-category"
                value={filter.categoryId}
                onChange={(event) => {
                  setPage(1);
                  setFilter((prev) => ({ ...prev, categoryId: event.target.value }));
                }}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="transactions-filter-period"
                className="text-sm font-medium leading-5 text-financy-text-secondary"
              >
                Período
              </label>
              {isPeriodReady && period ? (
                <PeriodSelector
                  id="transactions-filter-period"
                  data-testid="transactions-period"
                  value={period}
                  onChange={(nextPeriod) => {
                    setPage(1);
                    setPeriod(nextPeriod);
                  }}
                />
              ) : (
                <div className="inline-flex min-h-[50px] items-center rounded-lg border border-financy-border bg-financy-soft px-3.5 py-[15px] text-base leading-[18px] text-financy-muted">
                  Carregando período...
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-financy-border">
          <div className="sm:overflow-x-auto">
            <div className="hidden min-w-[960px] grid-cols-[minmax(280px,1fr)_84px_184px_128px_156px_128px] border-b border-financy-border sm:grid">
              <div className="box-border px-[25px] py-5 text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                Descrição
              </div>
              <div className="box-border px-[25px] py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                Data
              </div>
              <div className="box-border px-[25px] py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                Categoria
              </div>
              <div className="box-border px-[25px] py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                Tipo
              </div>
              <div className="box-border px-[25px] py-5 text-right text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                Valor
              </div>
              <div className="box-border px-[25px] py-5 text-right text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                Ações
              </div>
            </div>

            {transactionsLoading ? (
              <div className="p-6 text-center text-financy-muted" aria-live="polite">
                Carregando transações...
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-financy-muted">
                Nenhuma transação encontrada para o período selecionado.
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0 sm:min-w-[960px]">
                {transactions.map((transaction) => {
                  const isIncome = transaction.type === "INCOME";
                  const categoryVariant = getCategoryVariant(transaction.category);
                  const categoryIcon = transaction.category?.icon ?? "tag";
                  const { bgClassName, iconClassName } = getCategoryIconClasses(categoryVariant);

                  return (
                    <TransactionRow
                      key={transaction.id}
                      variant="table"
                      title={transaction.title}
                      date={new Date(transaction.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        timeZone: "UTC",
                      })}
                      categoryLabel={transaction.category?.name ?? "Sem categoria"}
                      categoryVariant={categoryVariant}
                      type={transaction.type}
                      amountLabel={`${isIncome ? "+" : "-"} ${currencyFormatter.format(transaction.amount)}`}
                      leadingIcon={
                        <CategoryIcon icon={categoryIcon} className={`h-4 w-4 ${iconClassName}`} />
                      }
                      leadingIconBgClassName={bgClassName}
                      actions={
                        <>
                          <IconButton
                            variant="danger"
                            aria-label="Excluir transação"
                            disabled={deleting}
                            onClick={() => setDeletingTransaction(transaction)}
                          >
                            <IconTrash className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            aria-label="Editar transação"
                            onClick={() => openEditDialog(transaction)}
                          >
                            <IconSquarePen className="h-4 w-4" />
                          </IconButton>
                        </>
                      }
                    />
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-3 border-t border-financy-border px-[25px] py-5 sm:min-w-[960px] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-financy-text-secondary">
                {tableRowsFrom} a {tableRowsTo} | {totalResults} resultados
              </p>

              <div className="flex items-center gap-2">
                <IconButton
                  aria-label="Página anterior"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <IconChevronLeft className="h-[9.333px] w-[5.333px]" />
                </IconButton>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                  <PaginationButton
                    key={value}
                    label={String(value)}
                    state={value === page ? "active" : "default"}
                    onClick={() => setPage(value)}
                  />
                ))}

                <IconButton
                  aria-label="Próxima página"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  <IconChevronRight className="h-[9.333px] w-[5.333px]" />
                </IconButton>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {periodRange ? (
        <CreateTransactionModal
          filter={periodRange}
          isOpen={isCreateDialogOpen || Boolean(editingTransaction)}
          mode={editingTransaction ? "edit" : "create"}
          transactionId={editingTransaction?.id ?? null}
          initialValues={
            editingTransaction
              ? {
                  description: editingTransaction.title,
                  date: editingTransaction.date.slice(0, 10),
                  amount: editingTransaction.amount,
                  type: editingTransaction.type,
                  categoryId: editingTransaction.categoryId,
                }
              : null
          }
          onClose={() => {
            setIsCreateDialogOpen(false);
            closeEditDialog();
          }}
          onSaved={async (mode) => {
            setActionError(null);
            setActionSuccess(
              mode === "edit"
                ? "Transação atualizada com sucesso."
                : "Transação criada com sucesso.",
            );
            await refetchTransactions();
            await refetchTransactionsCount();
          }}
        />
      ) : null}

      <Modal
        isOpen={Boolean(deletingTransaction)}
        onClose={closeDeleteDialog}
        showCloseButton
        title="Excluir transação"
        subtitle="Essa ação removerá a transação selecionada."
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-financy-muted">
            Deseja confirmar a exclusão desta transação?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={closeDeleteDialog}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleting}
              startIcon={<IconTrash className="h-4 w-4" />}
              className="!text-financy-danger hover:!text-financy-danger"
              onClick={handleConfirmDeleteTransaction}
            >
              {deleting ? "Excluindo..." : "Excluir transação"}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
};
