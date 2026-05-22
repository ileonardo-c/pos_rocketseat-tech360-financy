import { useAuth } from "@/lib/auth/auth-provider";
import { Navigate, Route, Routes } from "react-router-dom";

import { CategoriesPage } from "@/pages/categories-page";
import { ProfilePage } from "@/pages/profile-page";
import { ProtectedPage } from "@/pages/protected-page";
import { SigninPage } from "@/pages/signin-page";
import { SignupPage } from "@/pages/signup-page";
import { TransactionsPage } from "@/pages/transactions-page";

const RequireAuth = ({
  isAuthenticated,
  children,
}: { isAuthenticated: boolean; children: JSX.Element }) => {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <ProtectedPage /> : <SigninPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/categories"
        element={
          <RequireAuth isAuthenticated={Boolean(user)}>
            <CategoriesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/transactions"
        element={
          <RequireAuth isAuthenticated={Boolean(user)}>
            <TransactionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth isAuthenticated={Boolean(user)}>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
