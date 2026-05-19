import { Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { Categories } from "./pages/Categories";
import { Transactions } from "./pages/Transactions";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="app-shell">Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={isAuthenticated ? <Dashboard /> : <Login />}
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
