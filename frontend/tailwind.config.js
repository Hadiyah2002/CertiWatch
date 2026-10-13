/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep green sidebar theme
        brand: {
          DEFAULT: '#0B4D3B',
          light: '#0F6B52',
          dark: '#083A2C',
        },
        status: {
          active: '#16A34A',
          expiring: '#D97706',
          expired: '#DC2626',
          renewal: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
};
