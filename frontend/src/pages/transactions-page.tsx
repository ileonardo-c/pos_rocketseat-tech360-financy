import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";

import { useAuth } from "@/lib/auth/auth-provider";
import {
  CATEGORIES_QUERY,
  CREATE_TRANSACTION_MUTATION,
  DELETE_TRANSACTION_MUTATION,
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
};

const emptyForm: TransactionForm = {
  title: "",
  description: "",
  amount: "",
  type: "EXPENSE",
  date: "",
  categoryId: "",
};

const toDateInput = (isoString: string) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const buildCreatePayload = (form: TransactionForm) => ({
  title: form.title.trim(),
  description: form.description.trim() || null,
  amount: Number(form.amount),
  type: form.type,
  date: new Date(`${form.date}T00:00:00.000Z`).toISOString(),
  categoryId: form.categoryId,
});

const buildUpdatePayload = (form: TransactionForm) => ({
  title: form.title.trim(),
  description: form.description.trim() || null,
  amount: Number(form.amount),
  type: form.type,
  date: new Date(`${form.date}T00:00:00.000Z`).toISOString(),
  categoryId: form.categoryId,
});

export const TransactionsPage = () => {
  const { user } = useAuth();

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

  const categories = useMemo(() => categoriesData?.categories ?? [], [categoriesData?.categories]);
  const transactions = useMemo(
    () => transactionsData?.transactions ?? [],
    [transactionsData?.transactions],
  );

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if ((categoriesLoading || transactionsLoading) && categories.length === 0 && transactions.length === 0) {
    return <main>Carregando transacoes...</main>;
  }

  const isCreateDisabled =
    creating ||
    !form.title.trim() ||
    !form.amount ||
    !form.date ||
    !form.categoryId ||
    categories.length === 0;

  return (
    <main>
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Transacoes</h1>

      {categoriesError ? <p>Erro ao carregar categorias.</p> : null}
      {transactionsError ? <p>Erro ao carregar transacoes.</p> : null}

      {categories.length === 0 ? (
        <p>Crie uma categoria antes de cadastrar transacoes.</p>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (isCreateDisabled) {
              return;
            }

            await createTransaction({
              variables: { input: buildCreatePayload(form) },
            });

            setForm(emptyForm);
          }}
        >
          <label>
            Titulo
            <input
              autoComplete="off"
              required
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>

          <label>
            Descricao
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

          <button disabled={isCreateDisabled} type="submit">
            Criar transacao
          </button>
        </form>
      )}

      <section>
        {transactions.length === 0 ? (
          <p>Nenhuma transacao encontrada.</p>
        ) : (
          <ul>
            {transactions.map((transaction) => {
              const isEditing = editingId === transaction.id;
              const isUpdateDisabled =
                updating ||
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

                        await updateTransaction({
                          variables: {
                            id: transaction.id,
                            input: buildUpdatePayload(editingForm),
                          },
                        });

                        setEditingId(null);
                        setEditingForm(emptyForm);
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

                      <button disabled={isUpdateDisabled} type="submit">
                        Salvar
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
                      <strong>{transaction.title}</strong> - {transaction.type === "INCOME" ? "Receita" : "Despesa"} -
                      {" "}R$ {transaction.amount.toFixed(2)} - {transaction.category?.name ?? "Sem categoria"} -
                      {" "} {new Date(transaction.date).toLocaleDateString("pt-BR")}
                      {transaction.description ? ` - ${transaction.description}` : ""}
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
                              date: toDateInput(transaction.date),
                              categoryId: transaction.categoryId,
                            });
                          }}
                        >
                          Editar
                        </button>
                        <button
                          disabled={deleting}
                          type="button"
                          onClick={async () => {
                            await deleteTransaction({ variables: { id: transaction.id } });
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
