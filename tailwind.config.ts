import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          ink: "var(--accent-ink)",
        },
        soft: "var(--soft)",
        deco: "var(--deco)",
        line: "var(--line)",
        focus: "var(--focus)",
        // Status colors defined with accessibility in mind
        status: {
          high: {
            bg: "#FEE2E2",
            border: "#DC2626",
            text: "#991B1B",
            darkBg: "#450A0A",
            darkBorder: "#F87171",
            darkText: "#FECACA",
          },
          medium: {
            bg: "#FEF3C7",
            border: "#D97706",
            text: "#92400E",
            darkBg: "#451A03",
            darkBorder: "#FBBF24",
            darkText: "#FDE68A",
          },
          low: {
            bg: "#E0F2FE",
            border: "#0284C7",
            text: "#075985",
            darkBg: "#082F49",
            darkBorder: "#38BDF8",
            darkText: "#BAE6FD",
          },
          verified: {
            bg: "#DCFCE7",
            border: "#16A34A",
            text: "#166534",
            darkBg: "#052E16",
            darkBorder: "#4ADE80",
            darkText: "#BBF7D0",
          }
        }
      },
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["Public Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        floating: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
      }
    },
  },
  plugins: [],
};
export default config;
