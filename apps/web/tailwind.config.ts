import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090d",
        panel: "#10161d",
        line: "#1d2833",
        mint: "#3ee0b0",
        gold: "#e8c36a",
        mist: "#8b9aab",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(62, 224, 176, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
