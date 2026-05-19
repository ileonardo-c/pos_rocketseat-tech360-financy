import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <div className="card">
        <h2>Dashboard</h2>
        <p>Bem-vindo, {user?.name}</p>
        <p>Gerencie suas transações e categorias.</p>
        <div className="grid">
          <Link to="/categories">Categorias</Link>
          <Link to="/transactions">Transações</Link>
        </div>
        <button onClick={logout}>Sair</button>
      </div>
    </div>
  );
}
