import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "rgba(255, 255, 255, 0.1)",
        input: "rgba(255, 255, 255, 0.1)",
        ring: "rgba(255, 255, 255, 0.2)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--background)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--foreground)",
        },
        muted: {
          DEFAULT: "rgba(255, 255, 255, 0.4)",
          foreground: "rgba(255, 255, 255, 0.6)",
        },
        accent: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "var(--foreground)",
        },
        popover: {
          DEFAULT: "#0f0f11",
          foreground: "var(--foreground)",
        },
        card: {
          DEFAULT: "#0f0f11",
          foreground: "var(--foreground)",
        },
        neutral: {
          955: "#080808",
          850: "#1f1f1f",
          650: "#4a4a4a",
          555: "#5a5a5a",
          550: "#606060",
          450: "#8c8c8c",
          405: "#a0a0a0",
          350: "#b5b5b5",
          255: "#dcdcdc",
          250: "#e0e0e0",
          205: "#e2e2e2",
          105: "#f3f3f3",
        },
        purple: {
          550: "#844cf2",
          650: "#702ee6",
        },
        red: {
          955: "#1d0808",
        },
        yellow: {
          955: "#201a05",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("@tailwindcss/container-queries"),
  ],
};
export default config;
