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
        cream: "#FDF8F0",
        tea: "#F5E6C8",
        stage: "#1A1A2E",
        milk: "#D4A96A",
        coral: "#E8734A",
        mint: "#5DCAA5",
        lavender: "#7F77DD",
        danger: "#E24B4A",
        ink: "#3D2B1F",
        muted: "#8B6F5E"
      },
      boxShadow: {
        pixel: "4px 4px 0 #3D2B1F"
      }
    }
  },
  plugins: []
};

export default config;
