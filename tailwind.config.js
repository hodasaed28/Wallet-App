/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        darkBg: "#0f172a",
        cardBg: "#1e293b",
        incomeGreen: "#10b981",
        expenseRed: "#ef4444",
        visaPurple: "#8b5cf6",
        ewalletBlue: "#3b82f6",
        cashGreen: "#059669",
        amberWarn: "#f59e0b"
      }
    },
  },
  plugins: [],
}
