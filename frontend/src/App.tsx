import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";
import { CategoriesPage } from "@/pages/categories-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { ProfilePage } from "@/pages/profile-page";
import { SigninPage } from "@/pages/signin-page";
import { SignupPage } from "@/pages/signup-page";
import { StyleGuidePage } from "@/pages/style-guide-page";
import { TransactionsPage } from "@/pages/transactions-page";

const RequireAuth = ({
  isAuthenticated,
  children,
}: { isAuthenticated: boolean; children: JSX.Element }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { pathname } = location;
  const [displayLocation, setDisplayLocation] = useState(location);
  const [routeTransitionState, setRouteTransitionState] = useState<
    "entering" | "entered" | "exiting"
  >("entered");
  const transitionTimeoutRef = useRef<number | null>(null);

  const routeSignature = `${location.pathname}${location.hash}`;
  const displayRouteSignature = `${displayLocation.pathname}${displayLocation.hash}`;

  useEffect(() => {
    if (routeSignature === displayRouteSignature) {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      setDisplayLocation(location);
      setRouteTransitionState("entered");
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      setDisplayLocation(location);
      setRouteTransitionState("entered");
      return;
    }

    setRouteTransitionState("exiting");

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const closeDurationRaw =
      typeof window !== "undefined"
        ? window.getComputedStyle(document.documentElement).getPropertyValue("--panel-close-dur")
        : "";
    const closeDurationMs = Number.parseFloat(closeDurationRaw);
    const safeCloseDurationMs = Number.isNaN(closeDurationMs) ? 160 : closeDurationMs;

    transitionTimeoutRef.current = window.setTimeout(() => {
      transitionTimeoutRef.current = null;
      setDisplayLocation(location);
      setRouteTransitionState("entering");

      const openDurationRaw = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--panel-open-dur");
      const openDurationMs = Number.parseFloat(openDurationRaw);
      const safeOpenDurationMs = Number.isNaN(openDurationMs) ? 220 : openDurationMs;

      transitionTimeoutRef.current = window.setTimeout(() => {
        transitionTimeoutRef.current = null;
        setRouteTransitionState("entered");
      }, safeOpenDurationMs);
    }, safeCloseDurationMs);
  }, [location, routeSignature, displayRouteSignature]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, []);
  const isPublicRoute =
    pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  if (loading && !isPublicRoute) {
    return <div>Carregando...</div>;
  }

  const routeTransitionClassName =
    routeTransitionState === "exiting"
      ? "t-route t-route-exit"
      : routeTransitionState === "entering"
        ? "t-route t-route-enter"
        : "t-route";

  return (
    <div
      className={`${routeTransitionClassName} min-h-screen`}
      key={displayRouteSignature}
      data-testid="route-transition-root"
    >
      <Routes location={displayLocation}>
        <Route
          path="/"
          element={
            <RequireAuth isAuthenticated={Boolean(user)}>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <SigninPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
        {import.meta.env.DEV ? <Route path="/style-guide" element={<StyleGuidePage />} /> : null}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </div>
  );
}
