import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B2A4A",
        navy: "#0F1F3D",
        sand: "#F7F5EF",
        gold: "#D4A017",
        track: "#3D7068",
        alert: "#C0432B",
      },
      fontFamily: {
        display: ["var(--font-kanit)", "sans-serif"],
        body: ["var(--font-plex-thai)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
