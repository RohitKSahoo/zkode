/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        background: "#000000",
        foreground: "#FAFAFA",
        nothing: {
          red: "#D71921",
          black: "#000000",
          card: "#0A0A0A",
          surface: "#111111",
          border: "#262626",
          borderHover: "#404040",
          muted: "#737373",
        },
      },
    },
  },
  plugins: [],
};
