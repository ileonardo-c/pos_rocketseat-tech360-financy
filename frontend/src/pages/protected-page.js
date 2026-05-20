import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "@/lib/auth/auth-provider";
import { DASHBOARD_CATEGORIES_QUERY, DASHBOARD_TRANSACTIONS_QUERY, DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY, DASHBOARD_TRANSACTION_SUMMARY_QUERY, DASHBOARD_TRANSACTION_TIMELINE_QUERY, } from "@/lib/graphql/operations";
import { useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
const buildTransactionsPath = (params) => {
    const searchParams = new URLSearchParams();
    if (params.query) {
        searchParams.set("query", params.query);
    }
    if (params.type && params.type !== "ALL") {
        searchParams.set("type", params.type);
    }
    if (params.categoryId) {
        searchParams.set("categoryId", params.categoryId);
    }
    if (params.from) {
        searchParams.set("from", params.from);
    }
    if (params.to) {
        searchParams.set("to", params.to);
    }
    const queryString = searchParams.toString();
    return queryString ? `/transactions?${queryString}` : "/transactions";
};
const toDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const getCurrentMonthFilter = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
        from: toDateInput(firstDayOfMonth),
        to: toDateInput(today),
    };
};
const getAllPeriodFilterFromTransactions = (transactions) => {
    const today = toDateInput(new Date());
    if (transactions.length === 0) {
        return { from: "", to: "" };
    }
    const oldest = transactions.reduce((currentOldest, transaction) => {
        return new Date(transaction.date).getTime() < new Date(currentOldest.date).getTime()
            ? transaction
            : currentOldest;
    }, transactions[0]);
    return {
        from: toDateInput(new Date(oldest.date)),
        to: today,
    };
};
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});
const isValidDateInput = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [year, month, day] = value.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return (parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day);
};
const parseDashboardStateFromSearchParams = (searchParams) => {
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    const interval = searchParams.get("interval");
    return {
        summaryFilter: {
            from: isValidDateInput(from) ? from : "",
            to: isValidDateInput(to) ? to : "",
        },
        timelineInterval: interval === "MONTH" ? "MONTH" : "DAY",
    };
};
const buildSearchParamsFromDashboardState = (params) => {
    const searchParams = new URLSearchParams();
    if (params.summaryFilter.from) {
        searchParams.set("from", params.summaryFilter.from);
    }
    if (params.summaryFilter.to) {
        searchParams.set("to", params.summaryFilter.to);
    }
    if (params.timelineInterval !== "DAY") {
        searchParams.set("interval", params.timelineInterval);
    }
    return searchParams;
};
const isSameSummaryFilter = (left, right) => left.from === right.from && left.to === right.to;
export const ProtectedPage = () => {
    const { user, signout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsString = searchParams.toString();
    const parsedState = parseDashboardStateFromSearchParams(searchParams);
    const [summaryFilter, setSummaryFilter] = useState(() => parsedState.summaryFilter.from || parsedState.summaryFilter.to
        ? parsedState.summaryFilter
        : getCurrentMonthFilter());
    const [timelineInterval, setTimelineInterval] = useState(parsedState.timelineInterval);
    const [refreshError, setRefreshError] = useState(null);
    const isSyncingFromUrlRef = useRef(false);
    useEffect(() => {
        const nextParsedState = parseDashboardStateFromSearchParams(searchParams);
        const nextSummaryFilter = !nextParsedState.summaryFilter.from && !nextParsedState.summaryFilter.to
            ? getCurrentMonthFilter()
            : nextParsedState.summaryFilter;
        const hasStateChangeFromUrl = !isSameSummaryFilter(summaryFilter, nextSummaryFilter) ||
            timelineInterval !== nextParsedState.timelineInterval;
        setSummaryFilter((current) => {
            if (isSameSummaryFilter(current, nextSummaryFilter)) {
                return current;
            }
            return nextSummaryFilter;
        });
        setTimelineInterval((current) => {
            if (current === nextParsedState.timelineInterval) {
                return current;
            }
            return nextParsedState.timelineInterval;
        });
        if (hasStateChangeFromUrl) {
            isSyncingFromUrlRef.current = true;
        }
    }, [searchParams]);
    useEffect(() => {
        if (isSyncingFromUrlRef.current) {
            isSyncingFromUrlRef.current = false;
            return;
        }
        const nextSearchParams = buildSearchParamsFromDashboardState({
            summaryFilter,
            timelineInterval,
        });
        const next = nextSearchParams.toString();
        if (next !== searchParamsString) {
            setSearchParams(nextSearchParams, { replace: true });
        }
    }, [searchParamsString, setSearchParams, summaryFilter, timelineInterval]);
    const { data: categoriesData, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories, } = useQuery(DASHBOARD_CATEGORIES_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const { data: transactionsData, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions, } = useQuery(DASHBOARD_TRANSACTIONS_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: refetchSummary, } = useQuery(DASHBOARD_TRANSACTION_SUMMARY_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
        variables: {
            filter: {
                from: summaryFilter.from || null,
                to: summaryFilter.to || null,
            },
        },
    });
    const { data: categorySummaryData, loading: categorySummaryLoading, error: categorySummaryError, refetch: refetchCategorySummary, } = useQuery(DASHBOARD_TRANSACTION_CATEGORY_SUMMARY_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
        variables: {
            filter: {
                from: summaryFilter.from || null,
                to: summaryFilter.to || null,
            },
            limit: 5,
        },
    });
    const { data: timelineData, loading: timelineLoading, error: timelineError, refetch: refetchTimeline, } = useQuery(DASHBOARD_TRANSACTION_TIMELINE_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
        variables: {
            filter: {
                from: summaryFilter.from || null,
                to: summaryFilter.to || null,
            },
            interval: timelineInterval,
        },
    });
    if (!user) {
        return _jsx("div", { children: "Fazendo autentica\u00E7\u00E3o..." });
    }
    const categories = categoriesData?.categories ?? [];
    const transactions = transactionsData?.transactions ?? [];
    const isInitialLoading = (categoriesLoading && categoriesData === undefined) ||
        (transactionsLoading && transactionsData === undefined) ||
        (summaryLoading && summaryData === undefined) ||
        (categorySummaryLoading && categorySummaryData === undefined) ||
        (timelineLoading && timelineData === undefined);
    const summary = summaryData?.transactionSummary ?? {
        incomeTotal: 0,
        expenseTotal: 0,
        balance: 0,
        totalCount: 0,
        byType: [],
    };
    const categorySummary = categorySummaryData?.transactionCategorySummary ?? [];
    const timelinePoints = timelineData?.transactionTimeline ?? [];
    const totalCategoryVolume = useMemo(() => categorySummary.reduce((accumulator, category) => accumulator + category.total, 0), [categorySummary]);
    const latestTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
    const isRefreshing = !isInitialLoading &&
        (categoriesLoading ||
            transactionsLoading ||
            summaryLoading ||
            categorySummaryLoading ||
            timelineLoading);
    if (isInitialLoading) {
        return (_jsxs("main", { className: "dashboard", children: [_jsx("header", { className: "dashboard-header", children: _jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), _jsxs("p", { children: ["Bem-vindo, ", user.name] })] }) }), _jsx("p", { children: "Carregando vis\u00E3o consolidada..." })] }));
    }
    return (_jsxs("main", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Dashboard" }), _jsxs("p", { children: ["Bem-vindo, ", user.name] })] }), _jsxs("div", { className: "page-actions", children: [_jsx("button", { disabled: isRefreshing, type: "button", onClick: async () => {
                                    setRefreshError(null);
                                    const results = await Promise.allSettled([
                                        refetchCategories(),
                                        refetchTransactions(),
                                        refetchSummary(),
                                        refetchCategorySummary(),
                                        refetchTimeline(),
                                    ]);
                                    const failedCount = results.filter((result) => result.status === "rejected").length;
                                    if (failedCount === results.length) {
                                        setRefreshError("Não foi possível atualizar os dados do dashboard.");
                                        return;
                                    }
                                    if (failedCount > 0) {
                                        setRefreshError("Alguns dados do dashboard não foram atualizados. Tente novamente em instantes.");
                                    }
                                }, children: isRefreshing ? "Atualizando..." : "Atualizar" }), _jsx("button", { onClick: signout, type: "button", children: "Sair" })] })] }), _jsxs("nav", { className: "dashboard-links", children: [_jsx(Link, { to: "/categories", children: "Gerenciar categorias" }), _jsx(Link, { to: "/transactions", children: "Gerenciar transa\u00E7\u00F5es" })] }), categoriesError || transactionsError || summaryError || categorySummaryError || timelineError ? (_jsx("p", { children: "N\u00E3o foi poss\u00EDvel carregar todas as informa\u00E7\u00F5es do dashboard." })) : null, refreshError ? _jsx("p", { children: refreshError }) : null, _jsxs("section", { className: "dashboard-summary-filters", children: [_jsx("h2", { children: "Resumo por per\u00EDodo" }), _jsxs("div", { className: "dashboard-summary-filter-grid", children: [_jsxs("label", { children: ["De", _jsx("input", { type: "date", value: summaryFilter.from, onChange: (event) => setSummaryFilter((previous) => ({
                                            ...previous,
                                            from: event.target.value,
                                        })) })] }), _jsxs("label", { children: ["At\u00E9", _jsx("input", { type: "date", value: summaryFilter.to, onChange: (event) => setSummaryFilter((previous) => ({
                                            ...previous,
                                            to: event.target.value,
                                        })) })] })] }), _jsxs("div", { className: "dashboard-summary-filter-actions", children: [_jsx("button", { type: "button", onClick: () => setSummaryFilter(getCurrentMonthFilter()), children: "M\u00EAs atual" }), _jsx("button", { type: "button", onClick: () => setSummaryFilter(getAllPeriodFilterFromTransactions(transactions)), children: "Todo per\u00EDodo" }), _jsx("button", { type: "button", onClick: () => {
                                    setSummaryFilter(getCurrentMonthFilter());
                                    setTimelineInterval("DAY");
                                }, children: "Restaurar padr\u00E3o" })] })] }), _jsxs("section", { className: "dashboard-cards", children: [_jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Saldo atual" }), _jsx("p", { children: currencyFormatter.format(summary.balance) }), _jsx(Link, { className: "dashboard-card-link", to: buildTransactionsPath({
                                    from: summaryFilter.from,
                                    to: summaryFilter.to,
                                }), children: "Ver no extrato" })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Receitas" }), _jsx("p", { children: currencyFormatter.format(summary.incomeTotal) }), _jsx(Link, { className: "dashboard-card-link", to: buildTransactionsPath({
                                    type: "INCOME",
                                    from: summaryFilter.from,
                                    to: summaryFilter.to,
                                }), children: "Ver receitas" })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Despesas" }), _jsx("p", { children: currencyFormatter.format(summary.expenseTotal) }), _jsx(Link, { className: "dashboard-card-link", to: buildTransactionsPath({
                                    type: "EXPENSE",
                                    from: summaryFilter.from,
                                    to: summaryFilter.to,
                                }), children: "Ver despesas" })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Transa\u00E7\u00F5es" }), _jsx("p", { children: summary.totalCount }), _jsx(Link, { className: "dashboard-card-link", to: buildTransactionsPath({
                                    from: summaryFilter.from,
                                    to: summaryFilter.to,
                                }), children: "Ver todas" })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("h2", { children: "Categorias" }), _jsx("p", { children: categories.length }), _jsx(Link, { className: "dashboard-card-link", to: "/categories", children: "Abrir categorias" })] })] }), _jsxs("section", { className: "dashboard-type-breakdown", children: [_jsx("h2", { children: "Distribui\u00E7\u00E3o por tipo" }), _jsx("ul", { children: summary.byType.map((item) => (_jsxs("li", { children: [_jsx("strong", { children: item.type === "INCOME" ? "Receitas" : "Despesas" }), _jsxs("span", { children: [item.count, " lan\u00E7amento(s)"] }), _jsx("span", { children: currencyFormatter.format(item.total) })] }, item.type))) })] }), _jsxs("section", { className: "dashboard-timeline", children: [_jsxs("header", { className: "dashboard-timeline-header", children: [_jsx("h2", { children: "Evolu\u00E7\u00E3o financeira" }), _jsxs("div", { className: "dashboard-timeline-interval", children: [_jsx("button", { className: timelineInterval === "DAY" ? "is-active" : "", type: "button", onClick: () => setTimelineInterval("DAY"), children: "Di\u00E1rio" }), _jsx("button", { className: timelineInterval === "MONTH" ? "is-active" : "", type: "button", onClick: () => setTimelineInterval("MONTH"), children: "Mensal" })] })] }), timelinePoints.length === 0 ? (_jsx("p", { children: "Sem dados para o per\u00EDodo selecionado." })) : (_jsx("div", { className: "dashboard-timeline-table-wrap", children: _jsxs("table", { className: "dashboard-timeline-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Per\u00EDodo" }), _jsx("th", { children: "Receitas" }), _jsx("th", { children: "Despesas" }), _jsx("th", { children: "Saldo" }), _jsx("th", { children: "Saldo acumulado" }), _jsx("th", { children: "Lan\u00E7amentos" })] }) }), _jsx("tbody", { children: timelinePoints.map((point) => (_jsxs("tr", { children: [_jsx("td", { children: point.period }), _jsx("td", { children: currencyFormatter.format(point.incomeTotal) }), _jsx("td", { children: currencyFormatter.format(point.expenseTotal) }), _jsx("td", { children: currencyFormatter.format(point.balance) }), _jsx("td", { children: currencyFormatter.format(point.cumulativeBalance) }), _jsx("td", { children: point.count })] }, point.period))) })] }) }))] }), _jsxs("section", { className: "dashboard-category-ranking", children: [_jsx("h2", { children: "Top categorias no per\u00EDodo" }), categorySummary.length === 0 ? (_jsx("p", { children: "Sem movimenta\u00E7\u00F5es no per\u00EDodo selecionado." })) : (_jsx("ul", { children: categorySummary.map((category) => {
                            const percentage = totalCategoryVolume > 0 ? (category.total / totalCategoryVolume) * 100 : 0;
                            return (_jsxs("li", { children: [_jsxs("div", { className: "dashboard-category-ranking-header", children: [_jsx("strong", { children: category.categoryName }), _jsx("span", { children: currencyFormatter.format(category.total) })] }), _jsxs("div", { className: "dashboard-category-ranking-meta", children: [_jsxs("span", { children: [category.count, " lan\u00E7amento(s)"] }), _jsxs("span", { children: ["Saldo: ", currencyFormatter.format(category.balance)] })] }), _jsx(Link, { className: "dashboard-recent-link", to: buildTransactionsPath({
                                            categoryId: category.categoryId,
                                            from: summaryFilter.from,
                                            to: summaryFilter.to,
                                        }), children: "Ver transa\u00E7\u00F5es da categoria" }), _jsx("div", { "aria-hidden": "true", className: "dashboard-category-ranking-bar", style: { width: `${Math.max(percentage, 4)}%` } })] }, category.categoryId));
                        }) }))] }), _jsxs("section", { className: "dashboard-recent", children: [_jsx("h2", { children: "\u00DAltimas transa\u00E7\u00F5es" }), latestTransactions.length === 0 ? (_jsx("p", { children: "Nenhuma transa\u00E7\u00E3o cadastrada at\u00E9 o momento." })) : (_jsx("ul", { children: latestTransactions.map((transaction) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: transaction.title }), _jsx("p", { children: transaction.category?.name ?? "Sem categoria" })] }), _jsxs("div", { children: [_jsx("p", { children: transaction.type === "INCOME" ? "Receita" : "Despesa" }), _jsx("p", { children: new Date(transaction.date).toLocaleDateString("pt-BR") })] }), _jsx("strong", { children: currencyFormatter.format(transaction.amount) }), _jsx(Link, { className: "dashboard-recent-link", to: buildTransactionsPath({
                                        categoryId: transaction.category?.id,
                                        from: toDateInput(new Date(transaction.date)),
                                        to: toDateInput(new Date(transaction.date)),
                                    }), children: "Ver no extrato" })] }, transaction.id))) }))] })] }));
};
