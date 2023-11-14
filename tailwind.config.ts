import type { Config } from "tailwindcss";

import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", ...fontFamily.serif],
        sans: ["DM Sans", ...fontFamily.sans],
      },
    },
  },
  plugins: [],
} satisfies Config;
