import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-provider";
export const SignupPage = () => {
    const { user, signup, loading, authError, clearAuthError } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [touched, setTouched] = useState({ name: false, email: false, password: false });
    const getNameError = (value) => value.trim().length >= 2 ? "" : "Informe seu nome com pelo menos 2 caracteres.";
    const getEmailError = (value) => {
        if (!value.trim()) {
            return "Informe seu e-mail.";
        }
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return isEmailValid ? "" : "Informe um e-mail válido.";
    };
    const getPasswordError = (value) => value.length >= 6 ? "" : "A senha deve ter pelo menos 6 caracteres.";
    useEffect(() => {
        clearAuthError();
    }, [clearAuthError]);
    const nameError = useMemo(() => {
        if (!touched.name) {
            return "";
        }
        return getNameError(name);
    }, [name, touched.name]);
    const emailError = useMemo(() => {
        if (!touched.email) {
            return "";
        }
        return getEmailError(email);
    }, [email, touched.email]);
    const passwordError = useMemo(() => {
        if (!touched.password) {
            return "";
        }
        return getPasswordError(password);
    }, [password, touched.password]);
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return (_jsxs("main", { className: "auth-layout", children: [_jsx("h1", { children: "Criar conta" }), _jsxs("form", { className: "auth-form", onSubmit: async (event) => {
                    event.preventDefault();
                    setTouched({ name: true, email: true, password: true });
                    const submitNameError = getNameError(name);
                    const submitEmailError = getEmailError(email);
                    const submitPasswordError = getPasswordError(password);
                    if (submitNameError || submitEmailError || submitPasswordError) {
                        return;
                    }
                    await signup({ name: name.trim(), email: email.trim(), password });
                }, children: [_jsxs("label", { children: ["Nome", _jsx("input", { required: true, type: "text", value: name, onBlur: () => setTouched((prev) => ({ ...prev, name: true })), onChange: (event) => {
                                    clearAuthError();
                                    setName(event.target.value);
                                } }), nameError ? _jsx("span", { className: "form-error", children: nameError }) : null] }), _jsxs("label", { children: ["Email", _jsx("input", { autoComplete: "email", required: true, type: "email", value: email, onBlur: () => setTouched((prev) => ({ ...prev, email: true })), onChange: (event) => {
                                    clearAuthError();
                                    setEmail(event.target.value);
                                } }), emailError ? _jsx("span", { className: "form-error", children: emailError }) : null] }), _jsxs("label", { children: ["Senha", _jsx("input", { autoComplete: "new-password", required: true, type: "password", value: password, onBlur: () => setTouched((prev) => ({ ...prev, password: true })), onChange: (event) => {
                                    clearAuthError();
                                    setPassword(event.target.value);
                                } }), passwordError ? _jsx("span", { className: "form-error", children: passwordError }) : null] }), authError ? _jsx("p", { className: "form-error", children: authError }) : null, _jsx("button", { disabled: loading || Boolean(nameError) || Boolean(emailError) || Boolean(passwordError), type: "submit", children: loading ? "Cadastrando..." : "Cadastrar" })] }), _jsxs("p", { children: ["J\u00E1 possui conta? ", _jsx(Link, { to: "/", children: "Entrar" })] })] }));
};
