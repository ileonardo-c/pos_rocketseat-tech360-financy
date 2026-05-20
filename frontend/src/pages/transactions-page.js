import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CATEGORIES_QUERY, CREATE_TRANSACTION_MUTATION, DELETE_TRANSACTION_MUTATION, REQUEST_UPLOAD_URL_MUTATION, TRANSACTIONS_QUERY, UPDATE_TRANSACTION_MUTATION, } from "@/lib/graphql/operations";
const emptyForm = {
    title: "",
    description: "",
    amount: "",
    type: "EXPENSE",
    date: "",
    categoryId: "",
    receiptKey: "",
    receiptUrl: "",
};
const emptyFilter = {
    query: "",
    type: "ALL",
    categoryId: "",
    from: "",
    to: "",
};
const parseFilterFromSearchParams = (searchParams) => {
    const typeValue = searchParams.get("type");
    const parsedType = typeValue === "INCOME" || typeValue === "EXPENSE" ? typeValue : "ALL";
    return {
        query: searchParams.get("query") ?? "",
        type: parsedType,
        categoryId: searchParams.get("categoryId") ?? "",
        from: searchParams.get("from") ?? "",
        to: searchParams.get("to") ?? "",
    };
};
const buildSearchParamsFromFilter = (filter) => {
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
const filterFieldMap = {
    query: true,
    type: true,
    categoryId: true,
    from: true,
    to: true,
};
const isSameFilter = (left, right) => Object.keys(filterFieldMap).every((field) => left[field] === right[field]);
const toLocalDateInput = (value) => {
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
const getLastDaysRange = (days) => {
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
const buildTransactionPayload = (form) => ({
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
    const { data: categoriesData, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories, networkStatus: categoriesNetworkStatus, } = useQuery(CATEGORIES_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const { data: transactionsData, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions, networkStatus: transactionsNetworkStatus, } = useQuery(TRANSACTIONS_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [editingForm, setEditingForm] = useState(emptyForm);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [filter, setFilter] = useState(() => parseFilterFromSearchParams(searchParams));
    const [actionError, setActionError] = useState(null);
    const [uploadingCreateReceipt, setUploadingCreateReceipt] = useState(false);
    const [uploadingEditReceipt, setUploadingEditReceipt] = useState(false);
    const [sortField, setSortField] = useState("date");
    const [sortDirection, setSortDirection] = useState("desc");
    const [page, setPage] = useState(1);
    const editingIdRef = useRef(null);
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
    const [deleteTransaction, { loading: deleting }] = useMutation(DELETE_TRANSACTION_MUTATION, {
        refetchQueries: [{ query: TRANSACTIONS_QUERY }],
        awaitRefetchQueries: true,
    });
    const [requestUploadUrl] = useMutation(REQUEST_UPLOAD_URL_MUTATION);
    useEffect(() => {
        editingIdRef.current = editingId;
    }, [editingId]);
    useEffect(() => {
        const parsedFilter = parseFilterFromSearchParams(searchParams);
        setFilter((currentFilter) => isSameFilter(currentFilter, parsedFilter) ? currentFilter : parsedFilter);
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
    const transactions = useMemo(() => transactionsData?.transactions ?? [], [transactionsData?.transactions]);
    const isInitialLoading = (categoriesLoading || transactionsLoading) &&
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
            }
            else if (sortField === "amount") {
                compare = left.amount - right.amount;
            }
            else {
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
        const totals = filteredTransactions.reduce((accumulator, transaction) => {
            if (transaction.type === "INCOME") {
                accumulator.income += transaction.amount;
            }
            else {
                accumulator.expense += transaction.amount;
            }
            return accumulator;
        }, { income: 0, expense: 0 });
        return {
            incomeTotal: totals.income,
            expenseTotal: totals.expense,
            balance: totals.income - totals.expense,
        };
    }, [filteredTransactions]);
    const activeFilterChips = useMemo(() => {
        const chips = [];
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
        const groups = [];
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
            }
            else {
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
        const header = [
            "data",
            "titulo",
            "descricao",
            "tipo",
            "categoria",
            "valor",
            "comprovante_url",
        ];
        const escapeCsv = (value) => `"${value.replace(/"/g, '""')}"`;
        const rows = sortedTransactions.map((transaction) => [
            toLocalDateInput(transaction.date),
            transaction.title,
            transaction.description ?? "",
            transaction.type === "INCOME" ? "RECEITA" : "DESPESA",
            transaction.category?.name ?? "",
            transaction.amount.toFixed(2).replace(".", ","),
            transaction.receiptUrl ?? "",
        ]
            .map((value) => escapeCsv(value))
            .join(";"));
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
    const uploadReceipt = async (file) => {
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
    const handleEditReceiptUpload = async (transactionId, file) => {
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
        }
        catch {
            setActionError("Não foi possível enviar o comprovante.");
        }
        finally {
            setUploadingEditReceipt(false);
        }
    };
    const isCreateDisabled = creating ||
        uploadingCreateReceipt ||
        !form.title.trim() ||
        !form.amount ||
        !form.date ||
        !form.categoryId ||
        categories.length === 0;
    const isUpdateDisabled = updating ||
        uploadingEditReceipt ||
        !editingForm.title.trim() ||
        !editingForm.amount ||
        !editingForm.date ||
        !editingForm.categoryId;
    return (_jsxs("main", { className: "transactions-layout", children: [_jsx("p", { children: _jsx(Link, { to: "/", children: "Voltar" }) }), _jsx("h1", { children: "Transa\u00E7\u00F5es" }), categoriesError ? _jsx("p", { children: "Erro ao carregar categorias." }) : null, transactionsError ? _jsx("p", { children: "Erro ao carregar transa\u00E7\u00F5es." }) : null, actionError ? _jsx("p", { children: actionError }) : null, isInitialLoading ? _jsx("p", { children: "Carregando transa\u00E7\u00F5es..." }) : null, !isInitialLoading && categories.length === 0 ? (_jsx("p", { children: "Crie uma categoria antes de cadastrar transa\u00E7\u00F5es." })) : null, _jsxs("section", { className: "transactions-filters", children: [_jsx("h2", { children: "Filtros" }), _jsxs("div", { className: "transactions-toolbar", children: [_jsxs("div", { className: "transactions-sort-controls", children: [_jsxs("label", { children: ["Ordenar por", _jsxs("select", { value: sortField, onChange: (event) => setSortField(event.target.value), children: [_jsx("option", { value: "date", children: "Data" }), _jsx("option", { value: "amount", children: "Valor" }), _jsx("option", { value: "title", children: "T\u00EDtulo" })] })] }), _jsxs("label", { children: ["Dire\u00E7\u00E3o", _jsxs("select", { value: sortDirection, onChange: (event) => setSortDirection(event.target.value), children: [_jsx("option", { value: "desc", children: "Decrescente" }), _jsx("option", { value: "asc", children: "Crescente" })] })] })] }), _jsxs("div", { className: "transactions-toolbar-actions", children: [_jsx("button", { disabled: isRefreshing, type: "button", onClick: async () => {
                                            setActionError(null);
                                            const results = await Promise.allSettled([refetchCategories(), refetchTransactions()]);
                                            const failedCount = results.filter((result) => result.status === "rejected").length;
                                            if (failedCount === results.length) {
                                                setActionError("Não foi possível atualizar as transações.");
                                                return;
                                            }
                                            if (failedCount > 0) {
                                                setActionError("Alguns dados da tela de transações não foram atualizados. Tente novamente em instantes.");
                                            }
                                        }, children: isRefreshing ? "Atualizando..." : "Atualizar" }), _jsx("button", { type: "button", onClick: handleExportCsv, children: "Exportar CSV filtrado" }), _jsx("button", { disabled: categories.length === 0, type: "button", onClick: () => {
                                            setActionError(null);
                                            setForm(emptyForm);
                                            createDialogCycleRef.current += 1;
                                            setIsCreateDialogOpen(true);
                                        }, children: "Nova transa\u00E7\u00E3o" })] })] }), _jsxs("div", { className: "transactions-presets", children: [_jsx("button", { type: "button", onClick: () => {
                                    const range = getLastDaysRange(7);
                                    setFilter((prev) => ({ ...prev, ...range }));
                                }, children: "\u00DAltimos 7 dias" }), _jsx("button", { type: "button", onClick: () => {
                                    const range = getLastDaysRange(30);
                                    setFilter((prev) => ({ ...prev, ...range }));
                                }, children: "\u00DAltimos 30 dias" }), _jsx("button", { type: "button", onClick: () => {
                                    const range = getCurrentMonthRange();
                                    setFilter((prev) => ({ ...prev, ...range }));
                                }, children: "M\u00EAs atual" }), _jsx("button", { type: "button", onClick: () => {
                                    const range = getCurrentYearRange();
                                    setFilter((prev) => ({ ...prev, ...range }));
                                }, children: "Ano atual" })] }), _jsxs("div", { className: "transactions-filter-grid", children: [_jsxs("label", { children: ["Busca", _jsx("input", { placeholder: "T\u00EDtulo, descri\u00E7\u00E3o ou categoria", type: "text", value: filter.query, onChange: (event) => setFilter((prev) => ({
                                            ...prev,
                                            query: event.target.value,
                                        })) })] }), _jsxs("label", { children: ["Tipo", _jsxs("select", { value: filter.type, onChange: (event) => setFilter((prev) => ({
                                            ...prev,
                                            type: event.target.value,
                                        })), children: [_jsx("option", { value: "ALL", children: "Todos" }), _jsx("option", { value: "INCOME", children: "Receita" }), _jsx("option", { value: "EXPENSE", children: "Despesa" })] })] }), _jsxs("label", { children: ["Categoria", _jsxs("select", { value: filter.categoryId, onChange: (event) => setFilter((prev) => ({
                                            ...prev,
                                            categoryId: event.target.value,
                                        })), children: [_jsx("option", { value: "", children: "Todas" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] })] }), _jsxs("label", { children: ["De", _jsx("input", { type: "date", value: filter.from, onChange: (event) => setFilter((prev) => ({
                                            ...prev,
                                            from: event.target.value,
                                        })) })] }), _jsxs("label", { children: ["At\u00E9", _jsx("input", { type: "date", value: filter.to, onChange: (event) => setFilter((prev) => ({
                                            ...prev,
                                            to: event.target.value,
                                        })) })] })] }), _jsx("div", { className: "transactions-filter-actions", children: _jsx("button", { type: "button", onClick: () => setFilter(emptyFilter), children: "Limpar filtros" }) }), activeFilterChips.length > 0 ? (_jsx("div", { className: "transactions-active-filters", children: activeFilterChips.map((chip) => (_jsxs("button", { type: "button", onClick: () => setFilter((prev) => ({
                                ...prev,
                                [chip.key]: chip.key === "type" ? "ALL" : "",
                            })), children: [chip.label, " \u00D7"] }, chip.label))) })) : null] }), _jsxs("section", { className: "transactions-summary-grid", children: [_jsxs("article", { className: "transactions-summary-card", children: [_jsx("h3", { children: "Total filtrado" }), _jsx("p", { children: sortedTransactions.length })] }), _jsxs("article", { className: "transactions-summary-card", children: [_jsx("h3", { children: "Receitas filtradas" }), _jsx("p", { children: currencyFormatter.format(incomeTotal) })] }), _jsxs("article", { className: "transactions-summary-card", children: [_jsx("h3", { children: "Despesas filtradas" }), _jsx("p", { children: currencyFormatter.format(expenseTotal) })] }), _jsxs("article", { className: "transactions-summary-card", children: [_jsx("h3", { children: "Saldo filtrado" }), _jsx("p", { children: currencyFormatter.format(balance) })] })] }), _jsx("section", { children: sortedTransactions.length === 0 ? (_jsx("p", { children: "Nenhuma transa\u00E7\u00E3o encontrada para os filtros aplicados." })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "transactions-group-list", children: groupedTransactions.map((group, groupIndex) => (_jsxs("section", { className: "transactions-group", children: [_jsxs("header", { className: "transactions-group-header", children: [_jsxs("div", { children: [_jsx("h3", { children: group.dateLabel }), _jsxs("p", { children: [group.transactions.length, " transa\u00E7\u00E3o(\u00F5es)"] })] }), _jsxs("div", { className: "transactions-group-totals", children: [_jsxs("span", { children: ["Receitas: ", currencyFormatter.format(group.income)] }), _jsxs("span", { children: ["Despesas: ", currencyFormatter.format(group.expense)] }), _jsxs("strong", { children: ["Saldo: ", currencyFormatter.format(group.balance)] })] })] }), _jsx("ul", { children: group.transactions.map((transaction) => {
                                            return (_jsxs("li", { className: "transactions-item", children: [_jsxs("div", { className: "transactions-item-main", children: [_jsx("strong", { children: transaction.title }), _jsxs("p", { children: [transaction.type === "INCOME" ? "Receita" : "Despesa", " \u00B7", " ", currencyFormatter.format(transaction.amount), " \u00B7", " ", transaction.category?.name ?? "Sem categoria", " \u00B7", " ", new Date(transaction.date).toLocaleDateString("pt-BR")] }), transaction.description ? _jsx("p", { children: transaction.description }) : null, transaction.receiptUrl ? (_jsx("p", { children: _jsx("a", { href: transaction.receiptUrl, rel: "noreferrer", target: "_blank", children: "Comprovante" }) })) : null] }), _jsxs("div", { className: "transactions-item-actions", children: [_jsx("button", { type: "button", onClick: () => {
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
                                                                }, children: "Editar" }), _jsx("button", { disabled: deleting, type: "button", onClick: async () => {
                                                                    const confirmed = window.confirm("Deseja realmente excluir esta transação?");
                                                                    if (!confirmed) {
                                                                        return;
                                                                    }
                                                                    try {
                                                                        setActionError(null);
                                                                        await deleteTransaction({ variables: { id: transaction.id } });
                                                                    }
                                                                    catch {
                                                                        setActionError("Não foi possível excluir a transação.");
                                                                    }
                                                                }, children: "Excluir" })] })] }, transaction.id));
                                        }) })] }, `${group.dateKey}-${groupIndex}`))) }), _jsxs("div", { className: "transactions-pagination", children: [_jsx("button", { disabled: currentPage <= 1, type: "button", onClick: () => setPage((prev) => Math.max(1, prev - 1)), children: "Anterior" }), _jsxs("span", { children: ["P\u00E1gina ", currentPage, " de ", totalPages] }), _jsx("button", { disabled: currentPage >= totalPages, type: "button", onClick: () => setPage((prev) => Math.min(totalPages, prev + 1)), children: "Pr\u00F3xima" })] })] })) }), isCreateDialogOpen ? (_jsx("div", { className: "modal-overlay", role: "presentation", onClick: () => setIsCreateDialogOpen(false), children: _jsxs("div", { className: "modal-card transactions-modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { children: "Nova transa\u00E7\u00E3o" }), _jsxs("form", { onSubmit: async (event) => {
                                event.preventDefault();
                                if (isCreateDisabled) {
                                    return;
                                }
                                const currentCreateCycle = createDialogCycleRef.current;
                                try {
                                    setActionError(null);
                                    await createTransaction({
                                        variables: { input: buildTransactionPayload(form) },
                                    });
                                    setForm(emptyForm);
                                    if (createDialogCycleRef.current === currentCreateCycle) {
                                        setIsCreateDialogOpen(false);
                                    }
                                }
                                catch {
                                    setActionError("Não foi possível criar a transação.");
                                }
                            }, children: [_jsxs("label", { children: ["T\u00EDtulo", _jsx("input", { autoComplete: "off", required: true, type: "text", value: form.title, onChange: (event) => setForm((prev) => ({ ...prev, title: event.target.value })) })] }), _jsxs("label", { children: ["Descri\u00E7\u00E3o", _jsx("input", { autoComplete: "off", type: "text", value: form.description, onChange: (event) => setForm((prev) => ({
                                                ...prev,
                                                description: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Valor", _jsx("input", { min: "0", required: true, step: "0.01", type: "number", value: form.amount, onChange: (event) => setForm((prev) => ({
                                                ...prev,
                                                amount: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Tipo", _jsxs("select", { value: form.type, onChange: (event) => setForm((prev) => ({
                                                ...prev,
                                                type: event.target.value,
                                            })), children: [_jsx("option", { value: "EXPENSE", children: "Despesa" }), _jsx("option", { value: "INCOME", children: "Receita" })] })] }), _jsxs("label", { children: ["Data", _jsx("input", { required: true, type: "date", value: form.date, onChange: (event) => setForm((prev) => ({
                                                ...prev,
                                                date: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Categoria", _jsxs("select", { required: true, value: form.categoryId, onChange: (event) => setForm((prev) => ({
                                                ...prev,
                                                categoryId: event.target.value,
                                            })), children: [_jsx("option", { value: "", children: "Selecione" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] })] }), _jsxs("label", { children: ["Comprovante", _jsx("input", { accept: ".pdf,image/*", type: "file", onChange: async (event) => {
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
                                                }
                                                catch {
                                                    setActionError("Não foi possível enviar o comprovante.");
                                                }
                                                finally {
                                                    setUploadingCreateReceipt(false);
                                                    event.target.value = "";
                                                }
                                            } })] }), form.receiptUrl ? (_jsxs("p", { children: ["Comprovante anexado.", " ", _jsx("a", { href: form.receiptUrl, rel: "noreferrer", target: "_blank", children: "Abrir" }), " ", _jsx("button", { type: "button", onClick: () => setForm((prev) => ({
                                                ...prev,
                                                receiptKey: "",
                                                receiptUrl: "",
                                            })), children: "Remover" })] })) : null, _jsxs("div", { className: "modal-actions", children: [_jsx("button", { disabled: isCreateDisabled, type: "submit", children: uploadingCreateReceipt ? "Enviando comprovante..." : "Criar transação" }), _jsx("button", { type: "button", onClick: () => setIsCreateDialogOpen(false), children: "Cancelar" })] })] })] }) })) : null, editingId ? (_jsx("div", { className: "modal-overlay", role: "presentation", onClick: () => setEditingId(null), children: _jsxs("div", { className: "modal-card transactions-modal", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { children: "Editar transa\u00E7\u00E3o" }), _jsxs("form", { onSubmit: async (event) => {
                                event.preventDefault();
                                if (isUpdateDisabled) {
                                    return;
                                }
                                try {
                                    setActionError(null);
                                    await updateTransaction({
                                        variables: {
                                            id: editingId,
                                            input: buildTransactionPayload(editingForm),
                                        },
                                    });
                                    setEditingId(null);
                                    setEditingForm(emptyForm);
                                }
                                catch {
                                    setActionError("Não foi possível atualizar a transação.");
                                }
                            }, children: [_jsxs("label", { children: ["T\u00EDtulo", _jsx("input", { autoComplete: "off", required: true, type: "text", value: editingForm.title, onChange: (event) => setEditingForm((prev) => ({
                                                ...prev,
                                                title: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Descri\u00E7\u00E3o", _jsx("input", { autoComplete: "off", type: "text", value: editingForm.description, onChange: (event) => setEditingForm((prev) => ({
                                                ...prev,
                                                description: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Valor", _jsx("input", { min: "0", required: true, step: "0.01", type: "number", value: editingForm.amount, onChange: (event) => setEditingForm((prev) => ({
                                                ...prev,
                                                amount: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Tipo", _jsxs("select", { value: editingForm.type, onChange: (event) => setEditingForm((prev) => ({
                                                ...prev,
                                                type: event.target.value,
                                            })), children: [_jsx("option", { value: "EXPENSE", children: "Despesa" }), _jsx("option", { value: "INCOME", children: "Receita" })] })] }), _jsxs("label", { children: ["Data", _jsx("input", { required: true, type: "date", value: editingForm.date, onChange: (event) => setEditingForm((prev) => ({
                                                ...prev,
                                                date: event.target.value,
                                            })) })] }), _jsxs("label", { children: ["Categoria", _jsxs("select", { required: true, value: editingForm.categoryId, onChange: (event) => setEditingForm((prev) => ({
                                                ...prev,
                                                categoryId: event.target.value,
                                            })), children: [_jsx("option", { value: "", children: "Selecione" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] })] }), _jsxs("label", { children: ["Comprovante", _jsx("input", { accept: ".pdf,image/*", type: "file", onChange: async (event) => {
                                                const file = event.target.files?.[0];
                                                if (!file || !editingId) {
                                                    return;
                                                }
                                                await handleEditReceiptUpload(editingId, file);
                                                event.target.value = "";
                                            } })] }), editingForm.receiptUrl ? (_jsxs("p", { children: [_jsx("a", { href: editingForm.receiptUrl, rel: "noreferrer", target: "_blank", children: "Abrir comprovante" }), " ", _jsx("button", { type: "button", onClick: () => setEditingForm((prev) => ({
                                                ...prev,
                                                receiptKey: "",
                                                receiptUrl: "",
                                            })), children: "Remover comprovante" })] })) : null, _jsxs("div", { className: "modal-actions", children: [_jsx("button", { disabled: isUpdateDisabled, type: "submit", children: uploadingEditReceipt ? "Enviando comprovante..." : "Salvar" }), _jsx("button", { type: "button", onClick: () => {
                                                setEditingId(null);
                                                setEditingForm(emptyForm);
                                            }, children: "Cancelar" })] })] })] }) })) : null] }));
};
