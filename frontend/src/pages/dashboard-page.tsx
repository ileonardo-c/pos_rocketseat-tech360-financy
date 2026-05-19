import { Link } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";

export const DashboardPage = () => {
  const { user, signout } = useAuth();

  if (!user) {
    return <p>Redirecionando...</p>;
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Bem-vindo, {user.name}</p>
      <nav>
        <ul>
          <li>
            <Link to="/categories">Categorias</Link>
          </li>
          <li>
            <Link to="/transactions">Transações</Link>
          </li>
        </ul>
      </nav>
      <button onClick={signout}>Sair</button>
    </main>
  );
};
