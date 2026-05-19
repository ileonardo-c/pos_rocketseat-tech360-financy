import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-provider";
import { CategoriesPage } from "@/pages/categories-page";
import { SigninPage } from "@/pages/signin-page";
import { SignupPage } from "@/pages/signup-page";
import { ProtectedPage } from "@/pages/protected-page";
import { TransactionsPage } from "@/pages/transactions-page";
export function App() {
    const { user, loading } = useAuth();
    if (loading) {
        return _jsx("div", { children: "Carregando..." });
    }
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: user ? _jsx(ProtectedPage, {}) : _jsx(SigninPage, {}) }), _jsx(Route, { path: "/signup", element: _jsx(SignupPage, {}) }), _jsx(Route, { path: "/categories", element: user ? _jsx(CategoriesPage, {}) : _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/transactions", element: user ? _jsx(TransactionsPage, {}) : _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
