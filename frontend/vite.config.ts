import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
        target: process.env.VITE_BACKEND_URL || "http://backend:4000",
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
        target: process.env.VITE_BACKEND_URL || "http://backend:4000",
        changeOrigin: true,
      },
    },
  },
});
