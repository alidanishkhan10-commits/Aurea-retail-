/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium palette: white/black base with a restrained gold signature accent
        ink: "#0A0A0A",
        paper: "#FFFFFF",
        stone: "#F7F6F3",
        gold: {
          DEFAULT: "#B8924A",
          light: "#D9BC82",
          dark: "#8C6D33"
        }
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.06)",
        card: "0 2px 12px rgba(0,0,0,0.05)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
