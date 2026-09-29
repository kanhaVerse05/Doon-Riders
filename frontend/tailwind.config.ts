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
        brand: {
          green: '#00D96B',
          darkGreen: '#00A854',
          softGreen: '#EAFBF2',
          hoverGreen: '#F0FDF4',
          bg: '#F7F9FA',
          card: '#FFFFFF',
          textPrimary: '#111827',
          textSecondary: '#667085',
          textMuted: '#98A2B3',
          border: '#E5E7EB',
          blue: '#2196F3',
          orange: '#FF9800',
          purple: '#8B5CF6',
          cyan: '#14B8A6'
        },
        primary: {
          DEFAULT: "#00D96B",
          accent: "#00A854",
          hover: "#00B85A",
          dark: "#00A854",
        }
      },
      boxShadow: {
        'card': '0 2px 12px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.02)',
        'card-hover': '0 8px 24px rgba(16, 24, 40, 0.06)',
        'button-green': '0 4px 14px rgba(0, 217, 107, 0.35)',
        'glow-soft': '0 0 20px rgba(0, 217, 107, 0.15)',
      },
      fontFamily: {
        heading: ["var(--font-play)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        sub: ["var(--font-inter)", "sans-serif"],
      },
      animation: {
        'float-car': 'floatCar 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'marquee': 'marquee 20s linear infinite',
      },
      keyframes: {
        floatCar: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.12' },
          '50%': { opacity: '0.24' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
