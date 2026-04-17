/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          green: "#2563EB",
          orange: "#FF4A00",
          ink: "#0B1020",
          gray: "#0F172A"
        }
      },
      boxShadow: { card: "0 6px 20px rgba(16,24,40,0.08)" },
      borderRadius: { xl: "14px" }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")]
};