import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { CATEGORIES_QUERY, CREATE_TRANSACTION_MUTATION, DELETE_TRANSACTION_MUTATION, TRANSACTIONS_QUERY, UPDATE_TRANSACTION_MUTATION, } from "@/lib/graphql/operations";
const emptyForm = {
    title: "",
    description: "",
    amount: "",
    type: "EXPENSE",
    date: "",
    categoryId: "",
};
const toDateInput = (isoString) => {
    const date = new Date(isoString);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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
});
export const TransactionsPage = () => {
    const { data: categoriesData, loading: categoriesLoading, error: categoriesError, } = useQuery(CATEGORIES_QUERY, {
        fetchPolicy: "cache-and-network",
    });
    const { data: transactionsData, loading: transactionsLoading, error: transactionsError, } = useQuery(TRANSACTIONS_QUERY, {
        fetchPolicy: "cache-and-network",
    });
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [editingForm, setEditingForm] = useState(emptyForm);
    const [actionError, setActionError] = useState(null);
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
    const transactions = useMemo(() => transactionsData?.transactions ?? [], [transactionsData?.transactions]);
    if ((categoriesLoading || transactionsLoading) && categories.length === 0 && transactions.length === 0) {
        return _jsx("main", { children: "Carregando transa\u00E7\u00F5es..." });
    }
    const isCreateDisabled = creating ||
        !form.title.trim() ||
        !form.amount ||
        !form.date ||
        !form.categoryId ||
        categories.length === 0;
    return (_jsxs("main", { children: [_jsx("p", { children: _jsx(Link, { to: "/", children: "Voltar" }) }), _jsx("h1", { children: "Transa\u00E7\u00F5es" }), categoriesError ? _jsx("p", { children: "Erro ao carregar categorias." }) : null, transactionsError ? _jsx("p", { children: "Erro ao carregar transa\u00E7\u00F5es." }) : null, actionError ? _jsx("p", { children: actionError }) : null, categories.length === 0 ? (_jsx("p", { children: "Crie uma categoria antes de cadastrar transa\u00E7\u00F5es." })) : (_jsxs("form", { onSubmit: async (event) => {
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
                                })), children: [_jsx("option", { value: "", children: "Selecione" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] })] }), _jsx("button", { disabled: isCreateDisabled, type: "submit", children: "Criar transa\u00E7\u00E3o" })] })), _jsx("section", { children: transactions.length === 0 ? (_jsx("p", { children: "Nenhuma transa\u00E7\u00E3o encontrada." })) : (_jsx("ul", { children: transactions.map((transaction) => {
                        const isEditing = editingId === transaction.id;
                        const isUpdateDisabled = updating ||
                            !editingForm.title.trim() ||
                            !editingForm.amount ||
                            !editingForm.date ||
                            !editingForm.categoryId;
                        return (_jsx("li", { children: isEditing ? (_jsxs("form", { onSubmit: async (event) => {
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
                                    }
                                    catch {
                                        setActionError("Não foi possível atualizar a transação.");
                                    }
                                }, children: [_jsx("input", { autoComplete: "off", required: true, type: "text", value: editingForm.title, onChange: (event) => setEditingForm((prev) => ({
                                            ...prev,
                                            title: event.target.value,
                                        })) }), _jsx("input", { autoComplete: "off", type: "text", value: editingForm.description, onChange: (event) => setEditingForm((prev) => ({
                                            ...prev,
                                            description: event.target.value,
                                        })) }), _jsx("input", { min: "0", required: true, step: "0.01", type: "number", value: editingForm.amount, onChange: (event) => setEditingForm((prev) => ({
                                            ...prev,
                                            amount: event.target.value,
                                        })) }), _jsxs("select", { value: editingForm.type, onChange: (event) => setEditingForm((prev) => ({
                                            ...prev,
                                            type: event.target.value,
                                        })), children: [_jsx("option", { value: "EXPENSE", children: "Despesa" }), _jsx("option", { value: "INCOME", children: "Receita" })] }), _jsx("input", { required: true, type: "date", value: editingForm.date, onChange: (event) => setEditingForm((prev) => ({
                                            ...prev,
                                            date: event.target.value,
                                        })) }), _jsxs("select", { required: true, value: editingForm.categoryId, onChange: (event) => setEditingForm((prev) => ({
                                            ...prev,
                                            categoryId: event.target.value,
                                        })), children: [_jsx("option", { value: "", children: "Selecione" }), categories.map((category) => (_jsx("option", { value: category.id, children: category.name }, category.id)))] }), _jsx("button", { disabled: isUpdateDisabled, type: "submit", children: "Salvar" }), _jsx("button", { type: "button", onClick: () => {
                                            setEditingId(null);
                                            setEditingForm(emptyForm);
                                        }, children: "Cancelar" })] })) : (_jsxs(_Fragment, { children: [_jsx("strong", { children: transaction.title }), " - ", transaction.type === "INCOME" ? "Receita" : "Despesa", " -", " ", " ", currencyFormatter.format(transaction.amount), " - ", transaction.category?.name ?? "Sem categoria", " -", " ", " ", new Date(transaction.date).toLocaleDateString("pt-BR"), transaction.description ? ` - ${transaction.description}` : "", _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => {
                                                    setEditingId(transaction.id);
                                                    setEditingForm({
                                                        title: transaction.title,
                                                        description: transaction.description ?? "",
                                                        amount: String(transaction.amount),
                                                        type: transaction.type,
                                                        date: toDateInput(transaction.date),
                                                        categoryId: transaction.categoryId,
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
                                                }, children: "Excluir" })] })] })) }, transaction.id));
                    }) })) })] }));
};
