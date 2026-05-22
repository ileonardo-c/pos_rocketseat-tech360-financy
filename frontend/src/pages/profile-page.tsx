import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";
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
  const { signout, updateSessionUser, user } = useAuth();
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
    return form.name.trim() !== me.name;
  }, [form.name, me]);

  const initials = useMemo(() => {
    const source = me?.name || user?.name || "U";
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "U";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [me?.name, user?.name]);

  if (loading && !me) {
    return (
      <main className="profile-shell">
        <section className="profile-card">
          <p>Carregando perfil...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return <Navigate replace to="/" />;
  }

  if (!me) {
    return <Navigate replace to="/" />;
  }

  return (
    <main className="profile-shell">
      <header className="profile-topbar">
        <nav className="profile-nav">
          <Link to="/">Dashboard</Link>
          <Link to="/transactions">Transações</Link>
          <Link to="/categories">Categorias</Link>
        </nav>
      </header>

      <section className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <h1>{me.name}</h1>
        <p className="profile-email">{me.email}</p>
        <hr className="profile-divider" />

        {feedback ? (
          <p className={feedbackType === "error" ? "form-error" : "profile-success"}>{feedback}</p>
        ) : null}

        <form
          className="auth-form profile-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setFeedback(null);
            setFeedbackType(null);

            if (!hasChanges) {
              setFeedback("Nenhuma alteração para salvar.");
              return;
            }

            try {
              const result = await updateProfile({
                variables: {
                  input: {
                    name: form.name.trim(),
                    email: form.email.trim(),
                  },
                },
              });
              if (result.data?.updateProfile) {
                updateSessionUser(result.data.updateProfile);
              }
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
            Nome completo
            <input
              autoComplete="name"
              required
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            E-mail
            <input autoComplete="email" readOnly type="email" value={form.email} />
          </label>
          <p className="profile-muted">O e-mail não pode ser alterado.</p>
          <button disabled={updating || !hasChanges} type="submit">
            {updating ? "Salvando..." : "Salvar alterações"}
          </button>
          <button className="profile-signout" onClick={() => signout()} type="button">
            Sair da conta
          </button>
        </form>
      </section>
    </main>
  );
};
