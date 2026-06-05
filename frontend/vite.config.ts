import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const devProxyTarget = process.env.VITE_INTERNAL_BACKEND_URL || "http://backend:4000";

const normalizeAllowedHosts = (rawHosts: string) => {
  const hosts = rawHosts
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  const normalized = new Set<string>();

  for (const host of hosts) {
    try {
      const normalizedHost = new URL(host.includes("://") ? host : `http://${host}`).hostname;
      if (normalizedHost) {
        normalized.add(normalizedHost.toLowerCase());
      }
    } catch {
      normalized.add(host.toLowerCase());
    }
  }

  return [...normalized];
};

const allowedHosts = normalizeAllowedHosts(
  process.env.VITE_ALLOWED_HOSTS ?? "localhost,127.0.0.1,frontend",
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    allowedHosts,
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
