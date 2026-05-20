/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#e0e8ff",
          200: "#c2d0ff",
          300: "#9aafff",
          400: "#7188ff",
          500: "#4d65f5",
          600: "#3a4ed8",
          700: "#2e3eac",
          800: "#27358a",
          900: "#1f2a6e",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
