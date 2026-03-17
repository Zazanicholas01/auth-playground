/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./index.js",
    "./workspace-*.js",
    "./tailwind.css"
  ],
  safelist: [
    "active",
    "managed",
    "normal",
    "warning",
    "critical"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Avenir Next", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
