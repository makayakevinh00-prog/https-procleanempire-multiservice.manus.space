import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2f7",
          100: "#d7deeb",
          500: "#1e3a6e",
          700: "#17305c",
          900: "#101828"
        },
        accent: {
          400: "#4f8df5",
          500: "#1d6fe0",
          600: "#1559bd"
        },
        ink: "#101828",
        mist: "#f5f5f7"
      },
      boxShadow: {
        soft: "0 15px 35px -20px rgba(12, 27, 64, 0.4)"
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"SF Pro Display\"",
          "Inter",
          "\"Helvetica Neue\"",
          "Arial",
          "sans-serif"
        ]
      },
      maxWidth: {
        content: "1200px"
      }
    }
  },
  plugins: []
};

export default config;
