import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CATEGORIES_QUERY, TRANSACTIONS_QUERY } from "../lib/graphql/queries";
import {
  CREATE_TRANSACTION,
  DELETE_TRANSACTION,
  UPDATE_TRANSACTION,
} from "../lib/graphql/mutations";

export function Transactions() {
  const { data: transactionData, refetch } = useQuery(TRANSACTIONS_QUERY);
  const { data: categoryData } = useQuery(CATEGORIES_QUERY);
  const [createTransaction] = useMutation(CREATE_TRANSACTION);
  const [updateTransaction] = useMutation(UPDATE_TRANSACTION);
  const [deleteTransaction] = useMutation(DELETE_TRANSACTION);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("INCOME");
  const [categoryId, setCategoryId] = useState("");

  const transactions = transactionData?.transactions ?? [];
  const categories = categoryData?.categories ?? [];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !categoryId || !amount) return;

    await createTransaction({
      variables: {
        input: {
          title,
          description: description || undefined,
          amount: Number(amount),
          type,
          categoryId,
          date: new Date().toISOString(),
        },
      },
    });

    setTitle("");
    setDescription("");
    setAmount("");
    await refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction({ variables: { id } });
    await refetch();
  };

  const handleTypeChange = (id: string, nextType: "INCOME" | "EXPENSE") => {
    updateTransaction({
      variables: {
        id,
        input: {
          type: nextType,
        },
      },
    }).then(() => refetch());
  };

  const handleEdit = (id: string, currentTitle: string, currentAmount: number) => {
    const nextTitle = window.prompt("Novo título", currentTitle);
    const nextAmount = window.prompt("Novo valor", String(currentAmount));

    if (!nextTitle?.trim() && !nextAmount?.trim()) return;

    updateTransaction({
      variables: {
        id,
        input: {
          ...(nextTitle?.trim() ? { title: nextTitle.trim() } : {}),
          ...(nextAmount?.trim() ? { amount: Number(nextAmount) } : {}),
        },
      },
    }).then(() => refetch());
  };

  return (
    <div className="app-shell">
      <div className="card">
        <h2>Transações</h2>
        <form onSubmit={onSubmit} className="grid">
          <input
            placeholder="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            placeholder="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <input
            placeholder="Valor"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
          />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="INCOME">Entrada</option>
            <option value="EXPENSE">Saída</option>
          </select>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Selecione categoria</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit">Cadastrar</button>
        </form>
      </div>

      <div>
        {transactions.map((transaction: any) => (
          <div key={transaction.id} className="card">
            <h3>{transaction.title}</h3>
            <p>
              {transaction.type} • {transaction.amount}
            </p>
            <p>{transaction.category?.name ?? "Sem categoria"}</p>
            <p>{transaction.description}</p>
            <div className="grid">
              <button onClick={() => handleTypeChange(transaction.id, "INCOME")}>Entrada</button>
              <button onClick={() => handleTypeChange(transaction.id, "EXPENSE")}>Saída</button>
              <button
                onClick={() => handleEdit(transaction.id, transaction.title, transaction.amount)}
              >
                Editar
              </button>
              <button onClick={() => handleDelete(transaction.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
