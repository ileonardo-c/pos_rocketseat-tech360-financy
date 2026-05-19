import { useAuth } from "@/lib/auth/auth-provider";
import { Link } from "react-router-dom";

export const ProtectedPage = () => {
  const { user, signout } = useAuth();

  if (!user) {
    return <div>Fazendo autenticação...</div>;
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Bem-vindo, {user.name}</p>
      <nav>
        <Link to="/categories">Categorias</Link>
        <Link to="/transactions">Transações</Link>
      </nav>
      <button onClick={signout}>Sair</button>
    </main>
  );
};
