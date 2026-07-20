import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Тёмный изумрудный — шапка/футер
        emerald: {
          deep: "#0A312C",
          900: "#0B3A33",
          800: "#0E443C",
          700: "#125247",
        },
        // Глубокий сине-зелёный
        teal: {
          deep: "#0C3F3C",
          700: "#114F4A",
        },
        // Золото
        gold: {
          DEFAULT: "#C2A059",
          soft: "#D8BE83",
          light: "#E7D5A6",
          dark: "#A98842",
        },
        // Светлые тона
        cream: "#FBF7EF",
        milk: "#FDFBF6",
        beige: "#F1E8D7",
        sand: "#E7DAC1",
        ink: "#1E2C28",
        muted: "#5C6B66",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 40px -20px rgba(10, 49, 44, 0.28)",
        card: "0 24px 60px -30px rgba(10, 49, 44, 0.40)",
        gold: "0 10px 30px -12px rgba(194, 160, 89, 0.55)",
        float: "0 30px 70px -25px rgba(10, 49, 44, 0.55)",
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
      letterSpacing: {
        wider2: "0.22em",
      },
      maxWidth: {
        site: "1240px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "chat-in": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease forwards",
        "chat-in": "chat-in 0.35s ease forwards",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
