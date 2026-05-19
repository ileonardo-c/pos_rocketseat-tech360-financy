import { useAuth } from "@/lib/auth/auth-provider";

export const ProtectedPage = () => {
  const { user, signout } = useAuth();

  if (!user) {
    return <div>Fazendo autenticação...</div>;
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Bem-vindo, {user.name}</p>
      <button onClick={signout}>Sair</button>
      <p>As próximas telas de categorias e transações virão nos PRs seguintes.</p>
    </main>
  );
};
