import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  CATEGORIES_QUERY,
  CREATE_TRANSACTION_MUTATION,
  DELETE_TRANSACTION_MUTATION,
  REQUEST_UPLOAD_URL_MUTATION,
  TRANSACTIONS_QUERY,
  UPDATE_TRANSACTION_MUTATION,
} from "@/lib/graphql/operations";

type Category = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  receiptKey: string | null;
  receiptUrl: string | null;
  categoryId: string;
  category: Category | null;
};

type CategoriesNode = {
  categories: Category[];
};

type TransactionsNode = {
  transactions: Transaction[];
};

type TransactionForm = {
  title: string;
  description: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  categoryId: string;
  receiptKey: string;
  receiptUrl: string;
};

type TransactionFilter = {
  query: string;
  type: "ALL" | "INCOME" | "EXPENSE";
  categoryId: string;
  from: string;
  to: string;
};
type SortField = "date" | "amount" | "title";
type SortDirection = "asc" | "desc";

type UploadMutationResult = {
  requestUploadUrl: {
    url: string;
    key: string;
    publicUrl: string;
    expiresIn: number;
  };
};

type DeleteTransactionMutationResult = {
  deleteTransaction: boolean;
};

type TransactionFilterType = TransactionFilter["type"];

const emptyForm: TransactionForm = {
  title: "",
  description: "",
  amount: "",
  type: "EXPENSE",
  date: "",
  categoryId: "",
  receiptKey: "",
  receiptUrl: "",
};

const emptyFilter: TransactionFilter = {
  query: "",
  type: "ALL",
  categoryId: "",
  from: "",
  to: "",
};

const parseFilterFromSearchParams = (searchParams: URLSearchParams): TransactionFilter => {
  const typeValue = searchParams.get("type");
  const parsedType: TransactionFilterType =
    typeValue === "INCOME" || typeValue === "EXPENSE" ? typeValue : "ALL";

  return {
    query: searchParams.get("query") ?? "",
    type: parsedType,
    categoryId: searchParams.get("categoryId") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  };
};

const buildSearchParamsFromFilter = (filter: TransactionFilter) => {
  const searchParams = new URLSearchParams();

  if (filter.query) {
    searchParams.set("query", filter.query);
  }
  if (filter.type !== "ALL") {
    searchParams.set("type", filter.type);
  }
  if (filter.categoryId) {
    searchParams.set("categoryId", filter.categoryId);
  }
  if (filter.from) {
    searchParams.set("from", filter.from);
  }
  if (filter.to) {
    searchParams.set("to", filter.to);
  }

  return searchParams;
};

const filterFieldMap: Record<keyof TransactionFilter, true> = {
  query: true,
  type: true,
  categoryId: true,
  from: true,
  to: true,
};

const isSameFilter = (left: TransactionFilter, right: TransactionFilter) =>
  (Object.keys(filterFieldMap) as Array<keyof TransactionFilter>).every(
    (field) => left[field] === right[field],
  );

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

const getCurrentMonthRange = () => {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: toLocalDateInput(from),
    to: toLocalDateInput(today),
  };
};

const getCurrentYearRange = () => {
  const today = new Date();
  const from = new Date(today.getFullYear(), 0, 1);
  return {
    from: toLocalDateInput(from),
    to: toLocalDateInput(today),
  };
};

const getLastDaysRange = (days: number) => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));
  return {
    from: toLocalDateInput(from),
    to: toLocalDateInput(today),
  };
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const buildTransactionPayload = (form: TransactionForm) => ({
  title: form.title.trim(),
  description: form.description.trim() || null,
  amount: Number(form.amount),
  type: form.type,
  date: new Date(`${form.date}T00:00:00`).toISOString(),
  categoryId: form.categoryId,
  receiptKey: form.receiptKey.trim() || null,
  receiptUrl: form.receiptUrl.trim() || null,
});

export const TransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
    networkStatus: categoriesNetworkStatus,
  } = useQuery<CategoriesNode>(CATEGORIES_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
    networkStatus: transactionsNetworkStatus,
  } = useQuery<TransactionsNode>(TRANSACTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<TransactionForm>(emptyForm);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>(() =>
    parseFilterFromSearchParams(searchParams),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [uploadingCreateReceipt, setUploadingCreateReceipt] = useState(false);
  const [uploadingEditReceipt, setUploadingEditReceipt] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const editingIdRef = useRef<string | null>(null);
  const createDialogCycleRef = useRef(0);
  const itemsPerPage = 10;

  const [createTransaction, { loading: creating }] = useMutation(CREATE_TRANSACTION_MUTATION, {
    refetchQueries: [{ query: TRANSACTIONS_QUERY }],
    awaitRefetchQueries: true,
  });
  const [updateTransaction, { loading: updating }] = useMutation(UPDATE_TRANSACTION_MUTATION, {
    refetchQueries: [{ query: TRANSACTIONS_QUERY }],
    awaitRefetchQueries: true,
  });
  const [deleteTransaction, { loading: deleting }] = useMutation<DeleteTransactionMutationResult>(
    DELETE_TRANSACTION_MUTATION,
    {
      refetchQueries: [{ query: TRANSACTIONS_QUERY }],
      awaitRefetchQueries: true,
    },
  );
  const [requestUploadUrl] = useMutation<UploadMutationResult>(REQUEST_UPLOAD_URL_MUTATION);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    const parsedFilter = parseFilterFromSearchParams(searchParams);

    setFilter((currentFilter) =>
      isSameFilter(currentFilter, parsedFilter) ? currentFilter : parsedFilter,
    );
  }, [searchParams]);

  useEffect(() => {
    const nextSearchParams = buildSearchParamsFromFilter(filter);
    const current = searchParamsString;
    const next = nextSearchParams.toString();

    if (current !== next) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [filter, searchParamsString, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [filter, sortDirection, sortField]);

  const categories = useMemo(() => categoriesData?.categories ?? [], [categoriesData?.categories]);
  const transactions = useMemo(
    () => transactionsData?.transactions ?? [],
    [transactionsData?.transactions],
  );

  const isInitialLoading =
    (categoriesLoading || transactionsLoading) &&
    categories.length === 0 &&
    transactions.length === 0;
  const isRefreshing = categoriesNetworkStatus === 4 || transactionsNetworkStatus === 4;

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = filter.query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (filter.type !== "ALL" && transaction.type !== filter.type) {
        return false;
      }
      if (filter.categoryId && transaction.categoryId !== filter.categoryId) {
        return false;
      }

      const transactionDate = toLocalDateInput(transaction.date);
      if (filter.from && transactionDate < filter.from) {
        return false;
      }
      if (filter.to && transactionDate > filter.to) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        transaction.title,
        transaction.description ?? "",
        transaction.category?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [transactions, filter]);

  const sortedTransactions = useMemo(() => {
    const copy = [...filteredTransactions];
    copy.sort((left, right) => {
      let compare = 0;
      if (sortField === "date") {
        compare = new Date(left.date).getTime() - new Date(right.date).getTime();
      } else if (sortField === "amount") {
        compare = left.amount - right.amount;
      } else {
        compare = left.title.localeCompare(right.title, "pt-BR");
      }

      return sortDirection === "asc" ? compare : -compare;
    });
    return copy;
  }, [filteredTransactions, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / itemsPerPage));
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);
  const currentPage = Math.min(page, totalPages);
  const pagedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(start, start + itemsPerPage);
  }, [currentPage, sortedTransactions]);

  const { incomeTotal, expenseTotal, balance } = useMemo(() => {
    const totals = filteredTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === "INCOME") {
          accumulator.income += transaction.amount;
        } else {
          accumulator.expense += transaction.amount;
        }
        return accumulator;
      },
      { income: 0, expense: 0 },
    );

    return {
      incomeTotal: totals.income,
      expenseTotal: totals.expense,
      balance: totals.income - totals.expense,
    };
  }, [filteredTransactions]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof TransactionFilter; label: string }> = [];

    if (filter.query) {
      chips.push({ key: "query", label: `Busca: ${filter.query}` });
    }
    if (filter.type !== "ALL") {
      chips.push({
        key: "type",
        label: filter.type === "INCOME" ? "Tipo: Receita" : "Tipo: Despesa",
      });
    }
    if (filter.categoryId) {
      const categoryName = categories.find((category) => category.id === filter.categoryId)?.name;
      chips.push({
        key: "categoryId",
        label: `Categoria: ${categoryName ?? "Selecionada"}`,
      });
    }
    if (filter.from) {
      chips.push({ key: "from", label: `De: ${filter.from}` });
    }
    if (filter.to) {
      chips.push({ key: "to", label: `Até: ${filter.to}` });
    }

    return chips;
  }, [categories, filter]);

  const groupedTransactions = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      dateLabel: string;
      transactions: Transaction[];
      income: number;
      expense: number;
    }> = [];

    for (const transaction of pagedTransactions) {
      const dateKey = toLocalDateInput(transaction.date);
      const lastGroup = groups[groups.length - 1];
      const shouldCreateGroup = !lastGroup || lastGroup.dateKey !== dateKey;

      if (shouldCreateGroup) {
        groups.push({
          dateKey,
          dateLabel: new Date(transaction.date).toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          transactions: [transaction],
          income: transaction.type === "INCOME" ? transaction.amount : 0,
          expense: transaction.type === "EXPENSE" ? transaction.amount : 0,
        });
        continue;
      }

      lastGroup.transactions.push(transaction);
      if (transaction.type === "INCOME") {
        lastGroup.income += transaction.amount;
      } else {
        lastGroup.expense += transaction.amount;
      }
    }

    return groups.map((group) => ({
      dateKey: group.dateKey,
      dateLabel: group.dateLabel,
      transactions: group.transactions,
      income: group.income,
      expense: group.expense,
      balance: group.income - group.expense,
    }));
  }, [pagedTransactions]);

  const handleExportCsv = () => {
    if (sortedTransactions.length === 0) {
      setActionError("Não há transações para exportar com os filtros atuais.");
      return;
    }

    const header = ["data", "titulo", "descricao", "tipo", "categoria", "valor", "comprovante_url"];

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = sortedTransactions.map((transaction) =>
      [
        toLocalDateInput(transaction.date),
        transaction.title,
        transaction.description ?? "",
        transaction.type === "INCOME" ? "RECEITA" : "DESPESA",
        transaction.category?.name ?? "",
        transaction.amount.toFixed(2).replace(".", ","),
        transaction.receiptUrl ?? "",
      ]
        .map((value) => escapeCsv(value))
        .join(";"),
    );

    const csvContent = [header.join(";"), ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const dateSuffix = toLocalDateInput(new Date());
    const fileName = `financy-transacoes-${dateSuffix}.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const uploadReceipt = async (file: File) => {
    const uploadResponse = await requestUploadUrl({
      variables: {
        input: {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        },
      },
    });

    const payload = uploadResponse.data?.requestUploadUrl;
    if (!payload) {
      throw new Error("Falha ao gerar URL de upload.");
    }

    const putResponse = await fetch(payload.url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!putResponse.ok) {
      throw new Error("Falha ao enviar comprovante.");
    }

    return {
      receiptKey: payload.key,
      receiptUrl: payload.publicUrl,
    };
  };

  const handleEditReceiptUpload = async (transactionId: string, file: File) => {
    try {
      setActionError(null);
      setUploadingEditReceipt(true);
      const uploaded = await uploadReceipt(file);

      if (editingIdRef.current !== transactionId) {
        return;
      }

      setEditingForm((prev) => ({
        ...prev,
        receiptKey: uploaded.receiptKey,
        receiptUrl: uploaded.receiptUrl,
      }));
    } catch {
      setActionError("Não foi possível enviar o comprovante.");
    } finally {
      setUploadingEditReceipt(false);
    }
  };

  const isCreateDisabled =
    creating ||
    uploadingCreateReceipt ||
    !form.title.trim() ||
    !form.amount ||
    !form.date ||
    !form.categoryId ||
    categories.length === 0;

  const isUpdateDisabled =
    updating ||
    uploadingEditReceipt ||
    !editingForm.title.trim() ||
    !editingForm.amount ||
    !editingForm.date ||
    !editingForm.categoryId;

  const getTransactionActionErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "message" in error) {
      const message = String(error.message).toLowerCase();

      if (message.includes("category not found")) {
        return "Categoria inválida para esta transação.";
      }
      if (message.includes("invalid amount")) {
        return "Valor inválido. Informe um número válido.";
      }
      if (message.includes("invalid date")) {
        return "Data inválida.";
      }
      if (message.includes("transaction title is required")) {
        return "Título da transação é obrigatório.";
      }
      if (message.includes("transaction not found")) {
        return "Transação não encontrada.";
      }
      if (message.includes("invalid receipt for this user")) {
        return "Comprovante inválido para este usuário.";
      }
    }

    return fallback;
  };

  return (
    <main className="transactions-layout">
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Transações</h1>

      {categoriesError ? <p>Erro ao carregar categorias.</p> : null}
      {transactionsError ? <p>Erro ao carregar transações.</p> : null}
      {actionError ? <p>{actionError}</p> : null}
      {actionSuccess ? <p>{actionSuccess}</p> : null}

      {isInitialLoading ? <p>Carregando transações...</p> : null}
      {!isInitialLoading && categories.length === 0 ? (
        <p>Crie uma categoria antes de cadastrar transações.</p>
      ) : null}

      <section className="transactions-filters">
        <h2>Filtros</h2>
        <div className="transactions-toolbar">
          <div className="transactions-sort-controls">
            <label>
              Ordenar por
              <select
                value={sortField}
                onChange={(event) => setSortField(event.target.value as SortField)}
              >
                <option value="date">Data</option>
                <option value="amount">Valor</option>
                <option value="title">Título</option>
              </select>
            </label>
            <label>
              Direção
              <select
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
              >
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
            </label>
          </div>
          <div className="transactions-toolbar-actions">
            <button
              disabled={isRefreshing}
              type="button"
              onClick={async () => {
                setActionError(null);
                setActionSuccess(null);
                const results = await Promise.allSettled([
                  refetchCategories(),
                  refetchTransactions(),
                ]);
                const failedCount = results.filter((result) => result.status === "rejected").length;

                if (failedCount === results.length) {
                  setActionError("Não foi possível atualizar as transações.");
                  return;
                }

                if (failedCount > 0) {
                  setActionError(
                    "Alguns dados da tela de transações não foram atualizados. Tente novamente em instantes.",
                  );
                }
              }}
            >
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
            <button type="button" onClick={handleExportCsv}>
              Exportar CSV filtrado
            </button>
            <button
              disabled={categories.length === 0}
              type="button"
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
                setForm(emptyForm);
                createDialogCycleRef.current += 1;
                setIsCreateDialogOpen(true);
              }}
            >
              Nova transação
            </button>
          </div>
        </div>
        <div className="transactions-presets">
          <button
            type="button"
            onClick={() => {
              const range = getLastDaysRange(7);
              setFilter((prev) => ({ ...prev, ...range }));
            }}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => {
              const range = getLastDaysRange(30);
              setFilter((prev) => ({ ...prev, ...range }));
            }}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            onClick={() => {
              const range = getCurrentMonthRange();
              setFilter((prev) => ({ ...prev, ...range }));
            }}
          >
            Mês atual
          </button>
          <button
            type="button"
            onClick={() => {
              const range = getCurrentYearRange();
              setFilter((prev) => ({ ...prev, ...range }));
            }}
          >
            Ano atual
          </button>
        </div>
        <div className="transactions-filter-grid">
          <label>
            Busca
            <input
              placeholder="Título, descrição ou categoria"
              type="text"
              value={filter.query}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  query: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Tipo
            <select
              value={filter.type}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  type: event.target.value as TransactionFilter["type"],
                }))
              }
            >
              <option value="ALL">Todos</option>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </label>

          <label>
            Categoria
            <select
              value={filter.categoryId}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  categoryId: event.target.value,
                }))
              }
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            De
            <input
              type="date"
              value={filter.from}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  from: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Até
            <input
              type="date"
              value={filter.to}
              onChange={(event) =>
                setFilter((prev) => ({
                  ...prev,
                  to: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="transactions-filter-actions">
          <button type="button" onClick={() => setFilter(emptyFilter)}>
            Limpar filtros
          </button>
        </div>
        {activeFilterChips.length > 0 ? (
          <div className="transactions-active-filters">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  setFilter((prev) => ({
                    ...prev,
                    [chip.key]: chip.key === "type" ? "ALL" : "",
                  }))
                }
              >
                {chip.label} ×
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="transactions-summary-grid">
        <article className="transactions-summary-card">
          <h3>Total filtrado</h3>
          <p>{sortedTransactions.length}</p>
        </article>
        <article className="transactions-summary-card">
          <h3>Receitas filtradas</h3>
          <p>{currencyFormatter.format(incomeTotal)}</p>
        </article>
        <article className="transactions-summary-card">
          <h3>Despesas filtradas</h3>
          <p>{currencyFormatter.format(expenseTotal)}</p>
        </article>
        <article className="transactions-summary-card">
          <h3>Saldo filtrado</h3>
          <p>{currencyFormatter.format(balance)}</p>
        </article>
      </section>

      <section>
        {sortedTransactions.length === 0 ? (
          <p>Nenhuma transação encontrada para os filtros aplicados.</p>
        ) : (
          <>
            <div className="transactions-group-list">
              {groupedTransactions.map((group, groupIndex) => (
                <section key={`${group.dateKey}-${groupIndex}`} className="transactions-group">
                  <header className="transactions-group-header">
                    <div>
                      <h3>{group.dateLabel}</h3>
                      <p>{group.transactions.length} transação(ões)</p>
                    </div>
                    <div className="transactions-group-totals">
                      <span>Receitas: {currencyFormatter.format(group.income)}</span>
                      <span>Despesas: {currencyFormatter.format(group.expense)}</span>
                      <strong>Saldo: {currencyFormatter.format(group.balance)}</strong>
                    </div>
                  </header>
                  <ul>
                    {group.transactions.map((transaction) => {
                      return (
                        <li key={transaction.id} className="transactions-item">
                          <div className="transactions-item-main">
                            <strong>{transaction.title}</strong>
                            <p>
                              {transaction.type === "INCOME" ? "Receita" : "Despesa"} ·{" "}
                              {currencyFormatter.format(transaction.amount)} ·{" "}
                              {transaction.category?.name ?? "Sem categoria"} ·{" "}
                              {new Date(transaction.date).toLocaleDateString("pt-BR")}
                            </p>
                            {transaction.description ? <p>{transaction.description}</p> : null}
                            {transaction.receiptUrl ? (
                              <p>
                                <a href={transaction.receiptUrl} rel="noreferrer" target="_blank">
                                  Comprovante
                                </a>
                              </p>
                            ) : null}
                          </div>
                          <div className="transactions-item-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null);
                                setEditingId(transaction.id);
                                setEditingForm({
                                  title: transaction.title,
                                  description: transaction.description ?? "",
                                  amount: String(transaction.amount),
                                  type: transaction.type,
                                  date: toLocalDateInput(transaction.date),
                                  categoryId: transaction.categoryId,
                                  receiptKey: transaction.receiptKey ?? "",
                                  receiptUrl: transaction.receiptUrl ?? "",
                                });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              disabled={deleting}
                              type="button"
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  "Deseja realmente excluir esta transação?",
                                );
                                if (!confirmed) {
                                  return;
                                }

                                try {
                                  setActionError(null);
                                  setActionSuccess(null);
                                  const response = await deleteTransaction({
                                    variables: { id: transaction.id },
                                  });
                                  if (response.data?.deleteTransaction) {
                                    setActionSuccess("Transação excluída com sucesso.");
                                  } else {
                                    setActionError("Transação não encontrada para exclusão.");
                                  }
                                } catch (mutationError) {
                                  setActionError(
                                    getTransactionActionErrorMessage(
                                      mutationError,
                                      "Não foi possível excluir a transação.",
                                    ),
                                  );
                                }
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
            <div className="transactions-pagination">
              <button
                disabled={currentPage <= 1}
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>

      {isCreateDialogOpen ? (
        <div className="modal-overlay" role="presentation">
          <dialog className="modal-card transactions-modal" open>
            <h2>Nova transação</h2>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (isCreateDisabled) {
                  return;
                }
                const currentCreateCycle = createDialogCycleRef.current;

                try {
                  setActionError(null);
                  setActionSuccess(null);
                  await createTransaction({
                    variables: { input: buildTransactionPayload(form) },
                  });
                  setForm(emptyForm);
                  if (createDialogCycleRef.current === currentCreateCycle) {
                    setIsCreateDialogOpen(false);
                  }
                  setActionSuccess("Transação criada com sucesso.");
                } catch (mutationError) {
                  setActionError(
                    getTransactionActionErrorMessage(
                      mutationError,
                      "Não foi possível criar a transação.",
                    ),
                  );
                }
              }}
            >
              <label>
                Título
                <input
                  autoComplete="off"
                  required
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label>
                Descrição
                <input
                  autoComplete="off"
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Valor
                <input
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Tipo
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      type: event.target.value as TransactionForm["type"],
                    }))
                  }
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </label>
              <label>
                Data
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Categoria
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Comprovante
                <input
                  accept=".pdf,image/*"
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    try {
                      setActionError(null);
                      setUploadingCreateReceipt(true);
                      const uploaded = await uploadReceipt(file);
                      setForm((prev) => ({
                        ...prev,
                        receiptKey: uploaded.receiptKey,
                        receiptUrl: uploaded.receiptUrl,
                      }));
                    } catch {
                      setActionError("Não foi possível enviar o comprovante.");
                    } finally {
                      setUploadingCreateReceipt(false);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              {form.receiptUrl ? (
                <p>
                  Comprovante anexado.{" "}
                  <a href={form.receiptUrl} rel="noreferrer" target="_blank">
                    Abrir
                  </a>{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        receiptKey: "",
                        receiptUrl: "",
                      }))
                    }
                  >
                    Remover
                  </button>
                </p>
              ) : null}
              <div className="modal-actions">
                <button disabled={isCreateDisabled} type="submit">
                  {uploadingCreateReceipt ? "Enviando comprovante..." : "Criar transação"}
                </button>
                <button type="button" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </dialog>
        </div>
      ) : null}

      {editingId ? (
        <div className="modal-overlay" role="presentation">
          <dialog className="modal-card transactions-modal" open>
            <h2>Editar transação</h2>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (isUpdateDisabled) {
                  return;
                }

                try {
                  setActionError(null);
                  setActionSuccess(null);
                  await updateTransaction({
                    variables: {
                      id: editingId,
                      input: buildTransactionPayload(editingForm),
                    },
                  });
                  setEditingId(null);
                  setEditingForm(emptyForm);
                  setActionSuccess("Transação atualizada com sucesso.");
                } catch (mutationError) {
                  setActionError(
                    getTransactionActionErrorMessage(
                      mutationError,
                      "Não foi possível atualizar a transação.",
                    ),
                  );
                }
              }}
            >
              <label>
                Título
                <input
                  autoComplete="off"
                  required
                  type="text"
                  value={editingForm.title}
                  onChange={(event) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Descrição
                <input
                  autoComplete="off"
                  type="text"
                  value={editingForm.description}
                  onChange={(event) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Valor
                <input
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={editingForm.amount}
                  onChange={(event) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Tipo
                <select
                  value={editingForm.type}
                  onChange={(event) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      type: event.target.value as TransactionForm["type"],
                    }))
                  }
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </label>
              <label>
                Data
                <input
                  required
                  type="date"
                  value={editingForm.date}
                  onChange={(event) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Categoria
                <select
                  required
                  value={editingForm.categoryId}
                  onChange={(event) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Comprovante
                <input
                  accept=".pdf,image/*"
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !editingId) {
                      return;
                    }

                    await handleEditReceiptUpload(editingId, file);
                    event.target.value = "";
                  }}
                />
              </label>
              {editingForm.receiptUrl ? (
                <p>
                  <a href={editingForm.receiptUrl} rel="noreferrer" target="_blank">
                    Abrir comprovante
                  </a>{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setEditingForm((prev) => ({
                        ...prev,
                        receiptKey: "",
                        receiptUrl: "",
                      }))
                    }
                  >
                    Remover comprovante
                  </button>
                </p>
              ) : null}
              <div className="modal-actions">
                <button disabled={isUpdateDisabled} type="submit">
                  {uploadingEditReceipt ? "Enviando comprovante..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingForm(emptyForm);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </dialog>
        </div>
      ) : null}
    </main>
  );
};
