import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { ApolloProvider } from "@/lib/graphql/apollo";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container not found");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ApolloProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ApolloProvider>
    </BrowserRouter>
  </StrictMode>,
);
