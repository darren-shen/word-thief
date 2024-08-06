import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        'main-blue': '#2D3A7C',
      },
      boxShadow: {
        'inner-dark': 'inset 0 0 7px rgba(0, 0, 0, 0.4)', // Custom inner shadow
        'outer-dark': ' 0 4px 6px rgba(0, 0, 0, 0.4)', // Custom inner shadow
      },
    },
  },
  plugins: [],
};
export default config;
