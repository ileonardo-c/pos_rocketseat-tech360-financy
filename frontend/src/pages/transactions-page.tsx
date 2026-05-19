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

type UploadMutationResult = {
  requestUploadUrl: {
    url: string;
    key: string;
    publicUrl: string;
    expiresIn: number;
  };
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
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
  } = useQuery<CategoriesNode>(CATEGORIES_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError,
  } = useQuery<TransactionsNode>(TRANSACTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<TransactionForm>(emptyForm);
  const [filter, setFilter] = useState<TransactionFilter>(() =>
    parseFilterFromSearchParams(searchParams),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadingCreateReceipt, setUploadingCreateReceipt] = useState(false);
  const [uploadingEditReceipt, setUploadingEditReceipt] = useState(false);
  const editingIdRef = useRef<string | null>(null);

  const [createTransaction, { loading: creating }] = useMutation(CREATE_TRANSACTION_MUTATION, {
    refetchQueries: [{ query: TRANSACTIONS_QUERY }],
    awaitRefetchQueries: true,
  });
  const [updateTransaction, { loading: updating }] = useMutation(UPDATE_TRANSACTION_MUTATION, {
    refetchQueries: [{ query: TRANSACTIONS_QUERY }],
    awaitRefetchQueries: true,
  });
  const [deleteTransaction, { loading: deleting }] = useMutation(DELETE_TRANSACTION_MUTATION, {
    refetchQueries: [{ query: TRANSACTIONS_QUERY }],
    awaitRefetchQueries: true,
  });
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

  const categories = useMemo(() => categoriesData?.categories ?? [], [categoriesData?.categories]);
  const transactions = useMemo(
    () => transactionsData?.transactions ?? [],
    [transactionsData?.transactions],
  );

  const isInitialLoading =
    (categoriesLoading || transactionsLoading) &&
    categories.length === 0 &&
    transactions.length === 0;

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

  return (
    <main className="transactions-layout">
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Transações</h1>

      {categoriesError ? <p>Erro ao carregar categorias.</p> : null}
      {transactionsError ? <p>Erro ao carregar transações.</p> : null}
      {actionError ? <p>{actionError}</p> : null}

      {isInitialLoading ? (
        <p>Carregando transações...</p>
      ) : categories.length === 0 ? (
        <p>Crie uma categoria antes de cadastrar transações.</p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (isCreateDisabled) {
              return;
            }

            try {
              setActionError(null);
              await createTransaction({
                variables: { input: buildTransactionPayload(form) },
              });
              setForm(emptyForm);
            } catch {
              setActionError("Não foi possível criar a transação.");
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

          <button disabled={isCreateDisabled} type="submit">
            {uploadingCreateReceipt ? "Enviando comprovante..." : "Criar transação"}
          </button>
        </form>
      )}

      <section className="transactions-filters">
        <h2>Filtros</h2>
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

        <button type="button" onClick={() => setFilter(emptyFilter)}>
          Limpar filtros
        </button>
      </section>

      <section className="transactions-summary-grid">
        <article className="transactions-summary-card">
          <h3>Total filtrado</h3>
          <p>{filteredTransactions.length}</p>
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
        {filteredTransactions.length === 0 ? (
          <p>Nenhuma transação encontrada para os filtros aplicados.</p>
        ) : (
          <ul>
            {filteredTransactions.map((transaction) => {
              const isEditing = editingId === transaction.id;
              const isUpdateDisabled =
                updating ||
                uploadingEditReceipt ||
                !editingForm.title.trim() ||
                !editingForm.amount ||
                !editingForm.date ||
                !editingForm.categoryId;

              return (
                <li key={transaction.id}>
                  {isEditing ? (
                    <form
                      onSubmit={async (event) => {
                        event.preventDefault();
                        if (isUpdateDisabled) {
                          return;
                        }

                        try {
                          setActionError(null);
                          await updateTransaction({
                            variables: {
                              id: transaction.id,
                              input: buildTransactionPayload(editingForm),
                            },
                          });

                          setEditingId(null);
                          setEditingForm(emptyForm);
                        } catch {
                          setActionError("Não foi possível atualizar a transação.");
                        }
                      }}
                    >
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

                      <input
                        accept=".pdf,image/*"
                        type="file"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          await handleEditReceiptUpload(transaction.id, file);
                          event.target.value = "";
                        }}
                      />

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
                    </form>
                  ) : (
                    <>
                      <strong>{transaction.title}</strong> -{" "}
                      {transaction.type === "INCOME" ? "Receita" : "Despesa"} -{" "}
                      {currencyFormatter.format(transaction.amount)} -{" "}
                      {transaction.category?.name ?? "Sem categoria"} -{" "}
                      {new Date(transaction.date).toLocaleDateString("pt-BR")}
                      {transaction.description ? ` - ${transaction.description}` : ""}
                      {transaction.receiptUrl ? (
                        <>
                          {" "}
                          -{" "}
                          <a href={transaction.receiptUrl} rel="noreferrer" target="_blank">
                            Comprovante
                          </a>
                        </>
                      ) : null}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
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
                              await deleteTransaction({ variables: { id: transaction.id } });
                            } catch {
                              setActionError("Não foi possível excluir a transação.");
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
};
