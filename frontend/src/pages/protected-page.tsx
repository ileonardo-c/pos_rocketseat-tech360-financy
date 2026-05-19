import { useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useQuery } from "@apollo/client";
import {
  DASHBOARD_CATEGORIES_QUERY,
  DASHBOARD_TRANSACTIONS_QUERY,
} from "@/lib/graphql/operations";
import { Link } from "react-router-dom";

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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const ProtectedPage = () => {
  const { user, signout } = useAuth();
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } =
    useQuery<CategoriesNode>(DASHBOARD_CATEGORIES_QUERY, {
      fetchPolicy: "cache-and-network",
    });
  const { data: transactionsData, loading: transactionsLoading, error: transactionsError } =
    useQuery<TransactionsNode>(DASHBOARD_TRANSACTIONS_QUERY, {
      fetchPolicy: "cache-and-network",
    });

  if (!user) {
    return <div>Fazendo autenticação...</div>;
  }

  const categories = categoriesData?.categories ?? [];
  const transactions = transactionsData?.transactions ?? [];
  const isInitialLoading =
    (categoriesLoading && categoriesData === undefined) ||
    (transactionsLoading && transactionsData === undefined);

  const { incomeTotal, expenseTotal, balance } = useMemo(() => {
    const totals = transactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === "INCOME") {
          accumulator.incomeTotal += transaction.amount;
        } else {
          accumulator.expenseTotal += transaction.amount;
        }
        return accumulator;
      },
      { incomeTotal: 0, expenseTotal: 0 },
    );

    return {
      incomeTotal: totals.incomeTotal,
      expenseTotal: totals.expenseTotal,
      balance: totals.incomeTotal - totals.expenseTotal,
    };
  }, [transactions]);

  const latestTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

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
        <button onClick={signout} type="button">
          Sair
        </button>
      </header>

      <nav className="dashboard-links">
        <Link to="/categories">Gerenciar categorias</Link>
        <Link to="/transactions">Gerenciar transações</Link>
      </nav>

      {categoriesError || transactionsError ? (
        <p>Não foi possível carregar todas as informações do dashboard.</p>
      ) : null}

      <section className="dashboard-cards">
        <article className="dashboard-card">
          <h2>Saldo atual</h2>
          <p>{currencyFormatter.format(balance)}</p>
        </article>
        <article className="dashboard-card">
          <h2>Receitas</h2>
          <p>{currencyFormatter.format(incomeTotal)}</p>
        </article>
        <article className="dashboard-card">
          <h2>Despesas</h2>
          <p>{currencyFormatter.format(expenseTotal)}</p>
        </article>
        <article className="dashboard-card">
          <h2>Categorias</h2>
          <p>{categories.length}</p>
        </article>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
