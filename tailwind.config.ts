import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: "#effcf7",
          100: "#d7f7eb",
          500: "#35b990",
          600: "#249878"
        },
        coral: "#ff8f80",
        honey: "#f6b84b",
        ink: "#27323a"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(74, 113, 103, 0.14)",
        card: "0 12px 26px rgba(54, 91, 82, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
