import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          green: "#F29F67",   // primary
          orange: "#FF4A00",  // accent
          ink: "#0B1020",     // dark base
          gray: "#0F172A"     // slate-ish base
        }
      },
      boxShadow: {
        "card": "0 6px 20px rgba(16,24,40,0.08)"
      },
      borderRadius: {
        xl: "14px"
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
export default config;
