import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { CATEGORIES_QUERY, CREATE_CATEGORY_MUTATION, DELETE_CATEGORY_MUTATION, UPDATE_CATEGORY_MUTATION, } from "@/lib/graphql/operations";
export const CategoriesPage = () => {
    const { user } = useAuth();
    const { data, loading, error, refetch, networkStatus } = useQuery(CATEGORIES_QUERY, {
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
    });
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [actionError, setActionError] = useState(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createName, setCreateName] = useState("");
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingName, setEditingName] = useState("");
    const itemsPerPage = 10;
    const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY_MUTATION, {
        refetchQueries: [{ query: CATEGORIES_QUERY }],
        awaitRefetchQueries: true,
    });
    const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY_MUTATION, {
        refetchQueries: [{ query: CATEGORIES_QUERY }],
        awaitRefetchQueries: true,
    });
    const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CATEGORY_MUTATION, {
        refetchQueries: [{ query: CATEGORIES_QUERY }],
        awaitRefetchQueries: true,
    });
    const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
    const filteredCategories = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return categories
            .filter((category) => category.name.toLowerCase().includes(normalizedQuery))
            .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    }, [categories, query]);
    useEffect(() => {
        setPage(1);
    }, [query]);
    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
    useEffect(() => {
        setPage((prev) => Math.min(prev, totalPages));
    }, [totalPages]);
    const currentPage = Math.min(page, totalPages);
    const pagedCategories = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCategories.slice(start, start + itemsPerPage);
    }, [currentPage, filteredCategories]);
    const isRefreshing = networkStatus === 4;
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    if (loading && categories.length === 0) {
        return _jsx("main", { className: "categories-layout", children: "Carregando categorias..." });
    }
    return (_jsxs("main", { className: "categories-layout", children: [_jsx("p", { children: _jsx(Link, { to: "/", children: "Voltar" }) }), _jsx("h1", { children: "Categorias" }), _jsxs("section", { className: "categories-toolbar", children: [_jsxs("label", { children: ["Buscar categoria", _jsx("input", { autoComplete: "off", placeholder: "Ex.: Alimenta\u00E7\u00E3o", type: "text", value: query, onChange: (event) => setQuery(event.target.value) })] }), _jsx("button", { disabled: isRefreshing, type: "button", onClick: async () => {
                            try {
                                setActionError(null);
                                await refetch();
                            }
                            catch {
                                setActionError("Não foi possível atualizar a lista de categorias.");
                            }
                        }, children: isRefreshing ? "Atualizando..." : "Atualizar" }), _jsx("button", { type: "button", onClick: () => {
                            setActionError(null);
                            setCreateName("");
                            setIsCreateDialogOpen(true);
                        }, children: "Nova categoria" })] }), _jsxs("section", { className: "categories-summary-grid", children: [_jsxs("article", { className: "categories-summary-card", children: [_jsx("h2", { children: "Total" }), _jsx("p", { children: categories.length })] }), _jsxs("article", { className: "categories-summary-card", children: [_jsx("h2", { children: "Filtradas" }), _jsx("p", { children: filteredCategories.length })] })] }), error ? _jsx("p", { children: "Erro ao carregar categorias." }) : null, actionError ? _jsx("p", { children: actionError }) : null, _jsx("section", { children: filteredCategories.length === 0 ? (_jsx("p", { children: "Nenhuma categoria encontrada." })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "categories-list", children: pagedCategories.map((category) => (_jsxs("li", { className: "categories-item", children: [_jsx("strong", { children: category.name }), _jsxs("div", { className: "categories-item-actions", children: [_jsx("button", { type: "button", onClick: () => {
                                                    setActionError(null);
                                                    setEditingCategory(category);
                                                    setEditingName(category.name);
                                                }, children: "Editar" }), _jsx("button", { disabled: deleting, type: "button", onClick: async () => {
                                                    const confirmed = window.confirm("Deseja realmente excluir esta categoria?");
                                                    if (!confirmed) {
                                                        return;
                                                    }
                                                    try {
                                                        setActionError(null);
                                                        await deleteCategory({ variables: { id: category.id } });
                                                    }
                                                    catch {
                                                        setActionError("Não foi possível excluir a categoria.");
                                                    }
                                                }, children: "Excluir" })] })] }, category.id))) }), _jsxs("div", { className: "categories-pagination", children: [_jsx("button", { disabled: currentPage <= 1, type: "button", onClick: () => setPage((prev) => Math.max(1, prev - 1)), children: "Anterior" }), _jsxs("span", { children: ["P\u00E1gina ", currentPage, " de ", totalPages] }), _jsx("button", { disabled: currentPage >= totalPages, type: "button", onClick: () => setPage((prev) => Math.min(totalPages, prev + 1)), children: "Pr\u00F3xima" })] })] })) }), isCreateDialogOpen ? (_jsx("div", { className: "modal-overlay", role: "presentation", onClick: () => setIsCreateDialogOpen(false), children: _jsxs("div", { className: "modal-card", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { children: "Nova categoria" }), _jsxs("form", { onSubmit: async (event) => {
                                event.preventDefault();
                                const trimmed = createName.trim();
                                if (!trimmed) {
                                    return;
                                }
                                try {
                                    setActionError(null);
                                    await createCategory({ variables: { input: { name: trimmed } } });
                                    setCreateName("");
                                    setIsCreateDialogOpen(false);
                                }
                                catch {
                                    setActionError("Não foi possível criar a categoria.");
                                }
                            }, children: [_jsxs("label", { children: ["Nome", _jsx("input", { autoComplete: "off", required: true, type: "text", value: createName, onChange: (event) => setCreateName(event.target.value) })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { disabled: creating, type: "submit", children: "Criar" }), _jsx("button", { type: "button", onClick: () => setIsCreateDialogOpen(false), children: "Cancelar" })] })] })] }) })) : null, editingCategory ? (_jsx("div", { className: "modal-overlay", role: "presentation", onClick: () => setEditingCategory(null), children: _jsxs("div", { className: "modal-card", role: "dialog", "aria-modal": "true", onClick: (event) => event.stopPropagation(), children: [_jsx("h2", { children: "Editar categoria" }), _jsxs("form", { onSubmit: async (event) => {
                                event.preventDefault();
                                const nextName = editingName.trim();
                                if (!nextName) {
                                    return;
                                }
                                try {
                                    setActionError(null);
                                    await updateCategory({
                                        variables: { id: editingCategory.id, input: { name: nextName } },
                                    });
                                    setEditingCategory(null);
                                    setEditingName("");
                                }
                                catch {
                                    setActionError("Não foi possível atualizar a categoria.");
                                }
                            }, children: [_jsxs("label", { children: ["Nome", _jsx("input", { autoComplete: "off", required: true, type: "text", value: editingName, onChange: (event) => setEditingName(event.target.value) })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { disabled: updating, type: "submit", children: "Salvar" }), _jsx("button", { type: "button", onClick: () => {
                                                setEditingCategory(null);
                                                setEditingName("");
                                            }, children: "Cancelar" })] })] })] }) })) : null] }));
};
