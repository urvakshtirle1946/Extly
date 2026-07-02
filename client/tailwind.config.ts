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
    },
  },
  plugins: [],
};
export default config;
