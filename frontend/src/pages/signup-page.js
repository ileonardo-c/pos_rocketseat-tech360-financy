import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-provider";
export const SignupPage = () => {
    const { user, signup, loading } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return (_jsxs("main", { children: [_jsx("h1", { children: "Criar conta" }), _jsxs("form", { onSubmit: async (event) => {
                    event.preventDefault();
                    await signup({ name, email, password });
                }, children: [_jsxs("label", { children: ["Nome", _jsx("input", { required: true, type: "text", value: name, onChange: (event) => setName(event.target.value) })] }), _jsxs("label", { children: ["Email", _jsx("input", { autoComplete: "email", required: true, type: "email", value: email, onChange: (event) => setEmail(event.target.value) })] }), _jsxs("label", { children: ["Senha", _jsx("input", { autoComplete: "new-password", required: true, type: "password", value: password, onChange: (event) => setPassword(event.target.value) })] }), _jsx("button", { disabled: loading, type: "submit", children: "Cadastrar" })] }), _jsxs("p", { children: ["J\u00E1 possui conta? ", _jsx(Link, { to: "/", children: "Entrar" })] })] }));
};
