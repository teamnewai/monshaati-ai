import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf8ee',
          100: '#f9edcf',
          200: '#f2d99f',
          300: '#e9bf67',
          400: '#dfa43a',
          500: '#c8912a',
          600: '#a97022',
          700: '#87521e',
          800: '#6d401f',
          900: '#5a351c',
        },
      },
      fontFamily: {
        arabic: ["'Noto Sans Arabic'", 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
