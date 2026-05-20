import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";

import { useAuth } from "@/lib/auth/auth-provider";
import {
  CATEGORIES_QUERY,
  CREATE_CATEGORY_MUTATION,
  DELETE_CATEGORY_MUTATION,
  UPDATE_CATEGORY_MUTATION,
} from "@/lib/graphql/operations";

type Category = {
  id: string;
  name: string;
  userId: string;
};

type CategoryNode = {
  categories: Category[];
};

export const CategoriesPage = () => {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<CategoryNode>(CATEGORIES_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (loading && categories.length === 0) {
    return <main className="categories-layout">Carregando categorias...</main>;
  }

  return (
    <main className="categories-layout">
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Categorias</h1>

      <section className="categories-toolbar">
        <label>
          Buscar categoria
          <input
            autoComplete="off"
            placeholder="Ex.: Alimentação"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setCreateName("");
            setIsCreateDialogOpen(true);
          }}
        >
          Nova categoria
        </button>
      </section>

      <section className="categories-summary-grid">
        <article className="categories-summary-card">
          <h2>Total</h2>
          <p>{categories.length}</p>
        </article>
        <article className="categories-summary-card">
          <h2>Filtradas</h2>
          <p>{filteredCategories.length}</p>
        </article>
      </section>

      {error ? <p>Erro ao carregar categorias.</p> : null}
      {actionError ? <p>{actionError}</p> : null}

      <section>
        {filteredCategories.length === 0 ? (
          <p>Nenhuma categoria encontrada.</p>
        ) : (
          <>
            <ul className="categories-list">
              {pagedCategories.map((category) => (
                <li key={category.id} className="categories-item">
                  <strong>{category.name}</strong>
                  <div className="categories-item-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setEditingCategory(category);
                        setEditingName(category.name);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      disabled={deleting}
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm("Deseja realmente excluir esta categoria?");
                        if (!confirmed) {
                          return;
                        }

                        try {
                          setActionError(null);
                          await deleteCategory({ variables: { id: category.id } });
                        } catch {
                          setActionError("Não foi possível excluir a categoria.");
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="categories-pagination">
              <button
                disabled={currentPage <= 1}
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>

      {isCreateDialogOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => setIsCreateDialogOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Nova categoria</h2>
            <form
              onSubmit={async (event) => {
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
                } catch {
                  setActionError("Não foi possível criar a categoria.");
                }
              }}
            >
              <label>
                Nome
                <input
                  autoComplete="off"
                  required
                  type="text"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button disabled={creating} type="submit">
                  Criar
                </button>
                <button type="button" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingCategory ? (
        <div className="modal-overlay" role="presentation" onClick={() => setEditingCategory(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Editar categoria</h2>
            <form
              onSubmit={async (event) => {
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
                } catch {
                  setActionError("Não foi possível atualizar a categoria.");
                }
              }}
            >
              <label>
                Nome
                <input
                  autoComplete="off"
                  required
                  type="text"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button disabled={updating} type="submit">
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setEditingName("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
};
