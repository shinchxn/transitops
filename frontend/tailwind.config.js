// File: frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#05070d",
          900: "#080c16",
          800: "#0b1220",
          700: "#111a2e",
          600: "#182541",
          500: "#22335a",
        },
        brand: {
          300: "#7ea2ff",
          400: "#4f7bff",
          500: "#2f5fee",
          600: "#1e46d1",
          700: "#1836a8",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "drift": {
          "0%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(20px, -24px)" },
          "100%": { transform: "translate(0, 0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        drift: "drift 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
