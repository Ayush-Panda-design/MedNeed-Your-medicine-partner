import type { Config } from "tailwindcss";

// Brand palette: the MedNeed logo greens (dark forest "Med" #0b5a2b, leaf green "Need").
// The whole app styles its brand elements with `teal-*`, so the teal scale is remapped to
// this ramp: one change recolors every button, link, nav state and badge consistently.
const brandGreen = {
  50: "#F0F9F3",
  100: "#DCF2E3",
  200: "#bee3b4",
  300: "#92cf85",
  400: "#5cb44f",
  500: "#22A04E",
  600: "#1E7A3F",
  700: "#166534",
  800: "#0b5a2b",
  900: "#09471f",
  950: "#04290f",
};

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Theme tokens (defined in globals.css; they flip between light and dark mode).
      colors: {
        teal: brandGreen,
        page: "var(--bg-page)",
        surface: "var(--bg-surface)",
        subtle: "var(--bg-subtle)",
        ink: { DEFAULT: "var(--text-primary)", 2: "var(--text-secondary)", muted: "var(--text-muted)" },
        line: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        tint: { DEFAULT: "var(--green-tint-bg)", fg: "var(--green-tint-fg)" },
        chip: { DEFAULT: "var(--chip-bg)", fg: "var(--chip-fg)" },
      },
      boxShadow: { card: "var(--shadow-card)", "card-hover": "var(--shadow-hover)" },
      borderRadius: { card: "var(--radius-card)", control: "var(--radius-control)" },
      fontFamily: { lexend: ["var(--font-lexend)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
