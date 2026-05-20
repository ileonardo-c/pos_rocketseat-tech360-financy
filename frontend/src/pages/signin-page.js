import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-provider";
export const SigninPage = () => {
    const { user, signin, loading, authError, clearAuthError } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [touched, setTouched] = useState({ email: false, password: false });
    const getEmailError = (value) => {
        if (!value.trim()) {
            return "Informe seu e-mail.";
        }
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return isEmailValid ? "" : "Informe um e-mail válido.";
    };
    const getPasswordError = (value) => {
        if (!value) {
            return "Informe sua senha.";
        }
        return "";
    };
    useEffect(() => {
        clearAuthError();
    }, [clearAuthError]);
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
    return (_jsxs("main", { className: "auth-layout", children: [_jsx("h1", { children: "Login" }), _jsxs("form", { className: "auth-form", onSubmit: async (event) => {
                    event.preventDefault();
                    setTouched({ email: true, password: true });
                    const submitEmailError = getEmailError(email);
                    const submitPasswordError = getPasswordError(password);
                    if (submitEmailError || submitPasswordError) {
                        return;
                    }
                    await signin({ email: email.trim(), password });
                }, children: [_jsxs("label", { children: ["Email", _jsx("input", { autoComplete: "email", required: true, type: "email", value: email, onBlur: () => setTouched((prev) => ({ ...prev, email: true })), onChange: (event) => {
                                    clearAuthError();
                                    setEmail(event.target.value);
                                } }), emailError ? _jsx("span", { className: "form-error", children: emailError }) : null] }), _jsxs("label", { children: ["Senha", _jsx("input", { autoComplete: "current-password", required: true, type: "password", value: password, onBlur: () => setTouched((prev) => ({ ...prev, password: true })), onChange: (event) => {
                                    clearAuthError();
                                    setPassword(event.target.value);
                                } }), passwordError ? _jsx("span", { className: "form-error", children: passwordError }) : null] }), authError ? _jsx("p", { className: "form-error", children: authError }) : null, _jsx("button", { disabled: loading || Boolean(emailError) || Boolean(passwordError), type: "submit", children: loading ? "Entrando..." : "Entrar" })] }), _jsxs("p", { children: ["N\u00E3o tem conta? ", _jsx(Link, { to: "/signup", children: "Cadastrar" })] })] }));
};
