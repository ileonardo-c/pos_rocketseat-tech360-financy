import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useQuery } from "@apollo/client";
import {
  DASHBOARD_CATEGORIES_QUERY,
  DASHBOARD_TRANSACTION_SUMMARY_QUERY,
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const ProtectedPage = () => {
  const { user, signout } = useAuth();
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>(() => getCurrentMonthFilter());

  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } =
    useQuery<CategoriesNode>(DASHBOARD_CATEGORIES_QUERY, {
      fetchPolicy: "cache-and-network",
    });
  const { data: transactionsData, loading: transactionsLoading, error: transactionsError } =
    useQuery<TransactionsNode>(DASHBOARD_TRANSACTIONS_QUERY, {
      fetchPolicy: "cache-and-network",
    });
  const { data: summaryData, loading: summaryLoading, error: summaryError } =
    useQuery<TransactionSummaryNode>(DASHBOARD_TRANSACTION_SUMMARY_QUERY, {
      fetchPolicy: "cache-and-network",
      variables: {
        filter: {
          from: summaryFilter.from || null,
          to: summaryFilter.to || null,
        },
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
    (summaryLoading && summaryData === undefined);

  const summary = summaryData?.transactionSummary ?? {
    incomeTotal: 0,
    expenseTotal: 0,
    balance: 0,
    totalCount: 0,
    byType: [],
  };

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

      {categoriesError || transactionsError || summaryError ? (
        <p>Não foi possível carregar todas as informações do dashboard.</p>
      ) : null}

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
          <button type="button" onClick={() => setSummaryFilter({ from: "", to: "" })}>
            Todo período
          </button>
        </div>
      </section>

      <section className="dashboard-cards">
        <article className="dashboard-card">
          <h2>Saldo atual</h2>
          <p>{currencyFormatter.format(summary.balance)}</p>
        </article>
        <article className="dashboard-card">
          <h2>Receitas</h2>
          <p>{currencyFormatter.format(summary.incomeTotal)}</p>
        </article>
        <article className="dashboard-card">
          <h2>Despesas</h2>
          <p>{currencyFormatter.format(summary.expenseTotal)}</p>
        </article>
        <article className="dashboard-card">
          <h2>Transações</h2>
          <p>{summary.totalCount}</p>
        </article>
        <article className="dashboard-card">
          <h2>Categorias</h2>
          <p>{categories.length}</p>
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
