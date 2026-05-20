import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "@/lib/auth/auth-provider";
import { Navigate, Route, Routes } from "react-router-dom";
import { CategoriesPage } from "@/pages/categories-page";
import { ProtectedPage } from "@/pages/protected-page";
import { SigninPage } from "@/pages/signin-page";
import { SignupPage } from "@/pages/signup-page";
import { TransactionsPage } from "@/pages/transactions-page";
const RequireAuth = ({ isAuthenticated, children, }) => {
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return children;
};
export function App() {
    const { user, loading } = useAuth();
    if (loading) {
        return _jsx("div", { children: "Carregando..." });
    }
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: user ? _jsx(ProtectedPage, {}) : _jsx(SigninPage, {}) }), _jsx(Route, { path: "/signup", element: _jsx(SignupPage, {}) }), _jsx(Route, { path: "/categories", element: _jsx(RequireAuth, { isAuthenticated: Boolean(user), children: _jsx(CategoriesPage, {}) }) }), _jsx(Route, { path: "/transactions", element: _jsx(RequireAuth, { isAuthenticated: Boolean(user), children: _jsx(TransactionsPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
