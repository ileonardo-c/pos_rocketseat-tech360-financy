import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-provider";

import { CategoriesPage } from "@/pages/categories-page";
import { SigninPage } from "@/pages/signin-page";
import { SignupPage } from "@/pages/signup-page";
import { ProtectedPage } from "@/pages/protected-page";

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <ProtectedPage /> : <SigninPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/categories" element={user ? <CategoriesPage /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
