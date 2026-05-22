import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        financy: {
          background: "#f3f4f6",
          surface: "#ffffff",
          panel: "rgba(255, 255, 255, 0.95)",
          border: "#d0d7de",
          text: {
            primary: "#0f172a",
            muted: "#6b7280",
          },
          primary: {
            50: "#eef2ff",
            100: "#e0e7ff",
            200: "#c7d2fe",
            300: "#a5b4fc",
            400: "#818cf8",
            500: "#6366f1",
            600: "#4f46e5",
            700: "#4338ca",
            800: "#3730a3",
            900: "#312e81",
            950: "#1e1b4b",
          },
          success: "#16a34a",
          danger: "#dc2626",
        },
      },
      boxShadow: {
        panel: "0 20px 40px -18px rgb(15 23 42 / 0.4)",
      },
      borderRadius: {
        auth: "18px",
        card: "14px",
        pill: "999px",
      },
      spacing: {
        screenX: "24px",
        screenY: "16px",
        card: "16px",
        section: "12px",
      },
    },
  },
  plugins: [forms, typography],
};
