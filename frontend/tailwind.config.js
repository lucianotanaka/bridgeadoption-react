/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6f0fa",
          100: "#cce1f5",
          200: "#99c3eb",
          300: "#66a5e1",
          400: "#3387d7",
          500: "#0066cc",
          600: "#0052a3",
          700: "#003d7a",
          800: "#002952",
          900: "#001429",
        },
      },
    },
  },
  plugins: [],
};
