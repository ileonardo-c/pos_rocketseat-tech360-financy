import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devProxyTarget = process.env.VITE_INTERNAL_BACKEND_URL || "http://backend:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    proxy: {
      "/graphql": {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  preview: {
    proxy: {
      "/graphql": {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
