import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { CATEGORIES_QUERY, CREATE_CATEGORY_MUTATION, DELETE_CATEGORY_MUTATION, UPDATE_CATEGORY_MUTATION, } from "@/lib/graphql/operations";
export const CategoriesPage = () => {
    const { user } = useAuth();
    const { data, loading, error } = useQuery(CATEGORIES_QUERY, {
        fetchPolicy: "cache-and-network",
    });
    const [name, setName] = useState("");
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");
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
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    if (loading && categories.length === 0) {
        return _jsx("main", { children: "Carregando categorias..." });
    }
    return (_jsxs("main", { children: [_jsx("p", { children: _jsx(Link, { to: "/", children: "Voltar" }) }), _jsx("h1", { children: "Categorias" }), _jsxs("form", { onSubmit: async (event) => {
                    event.preventDefault();
                    const trimmed = name.trim();
                    if (!trimmed) {
                        return;
                    }
                    await createCategory({ variables: { input: { name: trimmed } } });
                    setName("");
                }, children: [_jsxs("label", { children: ["Nova categoria", _jsx("input", { autoComplete: "off", required: true, type: "text", value: name, onChange: (event) => setName(event.target.value) })] }), _jsx("button", { disabled: creating, type: "submit", children: "Criar" })] }), error ? _jsx("p", { children: "Erro ao carregar categorias." }) : null, _jsx("section", { children: categories.length === 0 ? (_jsx("p", { children: "Nenhuma categoria encontrada." })) : (_jsx("ul", { children: categories.map((category) => (_jsx("li", { children: editingCategoryId === category.id ? (_jsxs("form", { onSubmit: async (event) => {
                                event.preventDefault();
                                const nextName = editingCategoryName.trim();
                                if (!nextName) {
                                    return;
                                }
                                await updateCategory({ variables: { id: category.id, input: { name: nextName } } });
                                setEditingCategoryId(null);
                                setEditingCategoryName("");
                            }, children: [_jsx("input", { autoComplete: "off", required: true, type: "text", value: editingCategoryName, onChange: (event) => setEditingCategoryName(event.target.value) }), _jsx("button", { disabled: updating, type: "submit", children: "Salvar" }), _jsx("button", { type: "button", onClick: () => {
                                        setEditingCategoryId(null);
                                        setEditingCategoryName("");
                                    }, children: "Cancelar" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: category.name }), _jsx("button", { type: "button", onClick: () => {
                                        setEditingCategoryId(category.id);
                                        setEditingCategoryName(category.name);
                                    }, children: "Editar" }), _jsx("button", { disabled: deleting, type: "button", onClick: async () => {
                                        await deleteCategory({ variables: { id: category.id } });
                                    }, children: "Excluir" })] })) }, category.id))) })) })] }));
};
