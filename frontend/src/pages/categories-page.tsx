import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
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

  const [name, setName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
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
    return <Navigate to="/" replace />;
  }

  if (loading && categories.length === 0) {
    return <main>Carregando categorias...</main>;
  }

  return (
    <main>
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Categorias</h1>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = name.trim();

          if (!trimmed) {
            return;
          }

          await createCategory({ variables: { input: { name: trimmed } } });
          setName("");
        }}
      >
        <label>
          Nova categoria
          <input
            autoComplete="off"
            required
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button disabled={creating} type="submit">
          Criar
        </button>
      </form>

      {error ? <p>Erro ao carregar categorias.</p> : null}

      <section>
        {categories.length === 0 ? (
          <p>Nenhuma categoria encontrada.</p>
        ) : (
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                {editingCategoryId === category.id ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const nextName = editingCategoryName.trim();

                      if (!nextName) {
                        return;
                      }

                      await updateCategory({ variables: { id: category.id, input: { name: nextName } } });
                      setEditingCategoryId(null);
                      setEditingCategoryName("");
                    }}
                  >
                    <input
                      autoComplete="off"
                      required
                      type="text"
                      value={editingCategoryName}
                      onChange={(event) => setEditingCategoryName(event.target.value)}
                    />
                    <button disabled={updating} type="submit">
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setEditingCategoryName("");
                      }}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{category.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      disabled={deleting}
                      type="button"
                      onClick={async () => {
                        await deleteCategory({ variables: { id: category.id } });
                      }}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
