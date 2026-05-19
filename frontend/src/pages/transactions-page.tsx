import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";

import { useAuth } from "@/lib/auth/auth-provider";
import {
  CATEGORIES_FOR_SELECTOR_QUERY,
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
  type: string;
  date: string;
  categoryId: string;
  category: Category | null;
};

type TransactionsData = {
  transactions: Transaction[];
};

type CategoriesData = {
  categories: Category[];
};

const transactionTypeOptions = ["INCOME", "EXPENSE"];

export const TransactionsPage = () => {
  const { user } = useAuth();
  const { data: transactionData, loading: transactionLoading } = useQuery<TransactionsData>(TRANSACTIONS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const { data: categoryData, loading: categoriesLoading } = useQuery<CategoriesData>(CATEGORIES_FOR_SELECTOR_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("INCOME");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState("INCOME");
  const [editDate, setEditDate] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

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

  const transactions = useMemo(() => transactionData?.transactions ?? [], [transactionData?.transactions]);
  const categories = useMemo(() => categoryData?.categories ?? [], [categoryData?.categories]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isLoading = transactionLoading || categoriesLoading;

  if (isLoading && transactions.length === 0) {
    return <main>Carregando transações...</main>;
  }

  const canCreate = !!title.trim() && !!amount.trim() && !!categoryId;

  return (
    <main>
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Transações</h1>

      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (!canCreate) {
            return;
          }

          await createTransaction({
            variables: {
              input: {
                title: title.trim(),
                description: description.trim() || null,
                amount: Number(amount),
                type,
                date,
                categoryId,
              },
            },
          });
          setTitle("");
          setDescription("");
          setAmount("");
          setType("INCOME");
          setDate("");
          setCategoryId("");
        }}
      >
        <label>
          Título
          <input required type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Descrição
          <input type="text" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Valor
          <input required type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label>
          Tipo
          <select required value={type} onChange={(event) => setType(event.target.value)}>
            {transactionTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          Categoria
          <select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Selecione</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={creating} type="submit">
          Criar
        </button>
      </form>

      <section>
        {transactions.length === 0 ? (
          <p>Nenhuma transação encontrada.</p>
        ) : (
          <ul>
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                {editingId === transaction.id ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await updateTransaction({
                        variables: {
                          id: transaction.id,
                          input: {
                            title: editTitle.trim(),
                            description: editDescription.trim() || null,
                            amount: Number(editAmount),
                            type: editType,
                            date: editDate,
                            categoryId: editCategoryId,
                          },
                        },
                      });
                      setEditingId(null);
                    }}
                  >
                    <input required type="text" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                    />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(event) => setEditAmount(event.target.value)}
                    />
                    <select value={editType} onChange={(event) => setEditType(event.target.value)}>
                      {transactionTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input required type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
                    <select required value={editCategoryId} onChange={(event) => setEditCategoryId(event.target.value)}>
                      <option value="">Selecione</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <button disabled={updating} type="submit">
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <span>
                      {transaction.title} - {transaction.type} - R$ {Number(transaction.amount).toFixed(2)} -{" "}
                      {transaction.category?.name ?? "sem categoria"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(transaction.id);
                        setEditTitle(transaction.title);
                        setEditDescription(transaction.description ?? "");
                        setEditAmount(String(transaction.amount));
                        setEditType(transaction.type);
                        setEditDate(transaction.date);
                        setEditCategoryId(transaction.categoryId);
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
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
