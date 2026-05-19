import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CATEGORIES_QUERY } from "../lib/graphql/queries";
import {
  CREATE_CATEGORY,
  DELETE_CATEGORY,
  UPDATE_CATEGORY,
} from "../lib/graphql/mutations";

export function Categories() {
  const { data, refetch } = useQuery(CATEGORIES_QUERY);
  const [createCategory] = useMutation(CREATE_CATEGORY);
  const [updateCategory] = useMutation(UPDATE_CATEGORY);
  const [deleteCategory] = useMutation(DELETE_CATEGORY);

  const [name, setName] = useState("");

  const categories = data?.categories ?? [];

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createCategory({ variables: { input: { name } } });
    setName("");
    await refetch();
  };

  const handleRename = async (id: string) => {
    const next = window.prompt("Novo nome");
    if (!next?.trim()) return;
    await updateCategory({ variables: { id, input: { name: next.trim() } } });
    await refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteCategory({ variables: { id } });
    await refetch();
  };

  return (
    <div className="app-shell">
      <div className="card">
        <h2>Categorias</h2>
        <div className="grid">
          <input
            placeholder="Nova categoria"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button onClick={handleCreate}>Adicionar</button>
        </div>
      </div>

      <div className="grid">
        {categories.map((cat: any) => (
          <div key={cat.id} className="card">
            <h3>{cat.name}</h3>
            <div className="grid">
              <button onClick={() => handleRename(cat.id)}>Editar</button>
              <button onClick={() => handleDelete(cat.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
