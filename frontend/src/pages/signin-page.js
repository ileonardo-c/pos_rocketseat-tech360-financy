import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-provider";
export const SigninPage = () => {
    const { user, signin, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return (_jsxs("main", { children: [_jsx("h1", { children: "Login" }), _jsxs("form", { onSubmit: async (event) => {
                    event.preventDefault();
                    await signin({ email, password });
                }, children: [_jsxs("label", { children: ["Email", _jsx("input", { autoComplete: "email", required: true, type: "email", value: email, onChange: (event) => setEmail(event.target.value) })] }), _jsxs("label", { children: ["Senha", _jsx("input", { autoComplete: "current-password", required: true, type: "password", value: password, onChange: (event) => setPassword(event.target.value) })] }), _jsx("button", { disabled: loading, type: "submit", children: "Entrar" })] }), _jsxs("p", { children: ["N\u00E3o tem conta? ", _jsx(Link, { to: "/signup", children: "Cadastrar" })] })] }));
};
