/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Cloud Graphics brand ─────────────────────────────────────
           Sampled off the logo mark itself: the cloud gradient runs from
           #008cd0 (bright azure, left edge) to #0d394f (deep petrol, right),
           with #05618e as the dominant mid-tone. 600 is the signature
           colour; 700/800 carry buttons and their hovers. */
        brand: {
          50:  "#eff8fd",
          100: "#daeffa",
          200: "#b0def4",
          300: "#6fc3e9",
          400: "#238bbb",
          500: "#0274ad",
          600: "#05618e",
          700: "#094d6f",
          800: "#0a3f59",
          900: "#0d394f",
          950: "#072535",
        },
        /* Alias — keeps `primary-*` markup pointed at the brand. */
        primary: {
          50:  "#eff8fd",
          100: "#daeffa",
          200: "#b0def4",
          300: "#6fc3e9",
          400: "#238bbb",
          500: "#0274ad",
          600: "#05618e",
          700: "#094d6f",
          800: "#0a3f59",
          900: "#0d394f",
          950: "#072535",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        card:        "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover":"0 4px 16px -2px rgb(0 0 0 / 0.1), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
        "glow":      "0 0 0 3px rgb(5 97 142 / 0.20)",
        "glow-sm":   "0 0 0 2px rgb(5 97 142 / 0.16)",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        ping2: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        slideInLeft: {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up":    "fadeInUp 0.25s ease-out",
        "ping2":         "ping2 1.5s cubic-bezier(0,0,0.2,1) infinite",
        "slide-in-left": "slideInLeft 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        "shimmer":       "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
}
