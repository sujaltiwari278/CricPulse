/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // CricPulse cricket identity palette, available as e.g. bg-cp-ink, text-cp-emerald
        "cp-ink": "#0d1016",
        "cp-ink-2": "#161b26",
        "cp-emerald": "#147c4c",
        "cp-emerald-light": "#18965b",
        "cp-emerald-deep": "#0c5c39",
        "cp-leather": "#a8442f",
        "cp-leather-dark": "#7c3122",
        "cp-bronze": "#b5822a",
        "cp-bronze-light": "#d1a24c",
        "cp-parchment": "#f9f7f3",
        "cp-parchment-deep": "#ede7de",
      },
      fontFamily: {
        display: ["Bebas Neue", "Manrope", "system-ui", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};