import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useQuery } from "@apollo/client";
import { DASHBOARD_CATEGORIES_QUERY, DASHBOARD_TRANSACTIONS_QUERY, } from "@/lib/graphql/operations";
import { Link } from "react-router-dom";
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});
export const ProtectedPage = () => {
    const { user, signout } = useAuth();
    const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useQuery(DASHBOARD_CATEGORIES_QUERY, {
        fetchPolicy: "cache-and-network",
    });
    const { data: transactionsData, loading: transactionsLoading, error: transactionsError } = useQuery(DASHBOARD_TRANSACTIONS_QUERY, {
        fetchPolicy: "cache-and-network",
    });
    if (!user) {
        return _jsx("div", { children: "Fazendo autentica\u00E7\u00E3o..." });
    }
    const categories = categoriesData?.categories ?? [];
    const transactions = transactionsData?.transactions ?? [];
    const { incomeTotal, expenseTotal, balance } = useMemo(() => {
        const totals = transactions.reduce((accumulator, transaction) => {
            if (transaction.type === "INCOME") {
                accumulator.incomeTotal += transaction.amount;
            }
            else {
                accumulator.expenseTotal += transaction.amount;
            }
            return accumulator;
        }, { incomeTotal: 0, expenseTotal: 0 });
        return {
            incomeTotal: totals.incomeTotal,
            expenseTotal: totals.expenseTotal,
            balance: totals.incomeTotal - totals.expenseTotal,
        };
    }, [transactions]);
    const latestTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
    if ((categoriesLoading || transactionsLoading) && categories.length === 0 && transactions.length === 0) {
        return (_jsxs("main", { className: "dashboard", children: [_jsx("header", { className: "dashboard-header", children: _jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), _jsxs("p", { children: ["Bem-vindo, ", user.name] })] }) }), _jsx("p", { children: "Carregando vis\u00E3o consolidada..." })] }));
    }
    return (_jsxs("main", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), _jsxs("p", { children: ["Bem-vindo, ", user.name] })] }), _jsx("button", { onClick: signout, type: "button", children: "Sair" })] }), _jsxs("nav", { className: "dashboard-links", children: [_jsx(Link, { to: "/categories", children: "Gerenciar categorias" }), _jsx(Link, { to: "/transactions", children: "Gerenciar transa\u00E7\u00F5es" })] }), categoriesError || transactionsError ? (_jsx("p", { children: "N\u00E3o foi poss\u00EDvel carregar todas as informa\u00E7\u00F5es do dashboard." })) : null, _jsxs("section", { className: "dashboard-cards", children: [_jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Saldo atual" }), _jsx("p", { children: currencyFormatter.format(balance) })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Receitas" }), _jsx("p", { children: currencyFormatter.format(incomeTotal) })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Despesas" }), _jsx("p", { children: currencyFormatter.format(expenseTotal) })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Categorias" }), _jsx("p", { children: categories.length })] })] }), _jsxs("section", { className: "dashboard-recent", children: [_jsx("h2", { children: "\u00DAltimas transa\u00E7\u00F5es" }), latestTransactions.length === 0 ? (_jsx("p", { children: "Nenhuma transa\u00E7\u00E3o cadastrada at\u00E9 o momento." })) : (_jsx("ul", { children: latestTransactions.map((transaction) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: transaction.title }), _jsx("p", { children: transaction.category?.name ?? "Sem categoria" })] }), _jsxs("div", { children: [_jsx("p", { children: transaction.type === "INCOME" ? "Receita" : "Despesa" }), _jsx("p", { children: new Date(transaction.date).toLocaleDateString("pt-BR") })] }), _jsx("strong", { children: currencyFormatter.format(transaction.amount) })] }, transaction.id))) }))] })] }));
};
