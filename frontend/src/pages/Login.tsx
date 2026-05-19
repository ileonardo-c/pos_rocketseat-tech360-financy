import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login(email, password);
    } catch {
      setError("Credenciais inválidas");
    }
  };

  return (
    <div className="app-shell">
      <form onSubmit={handleSubmit} className="card">
        <h2>Financy — Login</h2>
        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p>{error}</p>}
        <button type="submit">Entrar</button>
        <p>
          Não tem conta? <Link to="/signup">Criar conta</Link>
        </p>
      </form>
    </div>
  );
}
