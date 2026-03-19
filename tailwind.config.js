/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Menlo', 'monospace'],
      },
      colors: {
        brand: { 600: '#2563EB', 700: '#1D4ED8' },
      },
      animation: {
        'pulse-ring': 'pulseRing 2s ease-in-out infinite',
        'slide-down': 'slideDown 0.4s ease',
      },
      keyframes: {
        pulseRing: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(37,99,235,.3)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(37,99,235,0)' },
        },
        slideDown: {
          from: { transform: 'translateY(-12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',     opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
