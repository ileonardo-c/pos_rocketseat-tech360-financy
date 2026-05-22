import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ME_QUERY, UPDATE_PROFILE_MUTATION } from "@/lib/graphql/operations";

type User = {
  id: string;
  name: string;
  email: string;
};

type MeQueryData = {
  me: User;
};

type UpdateProfileMutationData = {
  updateProfile: User;
};

type ProfileForm = {
  name: string;
  email: string;
};

export const ProfilePage = () => {
  const { data, loading, error } = useQuery<MeQueryData>(ME_QUERY, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [updateProfile, { loading: updating }] = useMutation<UpdateProfileMutationData>(
    UPDATE_PROFILE_MUTATION,
    {
      refetchQueries: [{ query: ME_QUERY }],
      awaitRefetchQueries: true,
    },
  );

  const [form, setForm] = useState<ProfileForm>({ name: "", email: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"error" | "success" | null>(null);

  const me = data?.me ?? null;

  useEffect(() => {
    if (!me) {
      return;
    }
    setForm({ name: me.name, email: me.email });
  }, [me]);

  const hasChanges = useMemo(() => {
    if (!me) {
      return false;
    }
    return form.name.trim() !== me.name || form.email.trim().toLowerCase() !== me.email;
  }, [form.email, form.name, me]);

  if (loading && !me) {
    return <p>Carregando perfil...</p>;
  }

  if (error || !me) {
    return (
      <main className="profile-layout">
        <p>
          <Link to="/">Voltar</Link>
        </p>
        <h1>Perfil</h1>
        <p>Não foi possível carregar o perfil.</p>
      </main>
    );
  }

  return (
    <main className="profile-layout">
      <p>
        <Link to="/">Voltar</Link>
      </p>
      <h1>Perfil</h1>
      <p>Atualize seus dados de acesso.</p>

      {feedback ? <p className={feedbackType === "error" ? "form-error" : ""}>{feedback}</p> : null}

      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setFeedback(null);
          setFeedbackType(null);

          if (!hasChanges) {
            setFeedback("Nenhuma alteração para salvar.");
            return;
          }

          try {
            await updateProfile({
              variables: {
                input: {
                  name: form.name.trim(),
                  email: form.email.trim(),
                },
              },
            });
            setFeedback("Perfil atualizado com sucesso.");
            setFeedbackType("success");
          } catch (mutationError) {
            const message =
              mutationError && typeof mutationError === "object" && "message" in mutationError
                ? String(mutationError.message)
                : "Não foi possível atualizar o perfil.";
            setFeedback(message);
            setFeedbackType("error");
          }
        }}
      >
        <label>
          Nome
          <input
            autoComplete="name"
            required
            type="text"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>
        <label>
          Email
          <input
            autoComplete="email"
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>
        <button disabled={updating || !hasChanges} type="submit">
          {updating ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </main>
  );
};
