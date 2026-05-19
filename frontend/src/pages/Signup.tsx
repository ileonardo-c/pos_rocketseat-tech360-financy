import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { signup } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await signup(name, email, password);
    } catch {
      setError("Falha ao cadastrar");
    }
  };

  return (
    <div className="app-shell">
      <form onSubmit={handleSubmit} className="card">
        <h2>Financy — Cadastro</h2>
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
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
        <button type="submit">Criar conta</button>
      </form>
    </div>
  );
}
