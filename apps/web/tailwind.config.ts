import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 10thirtyLabs brand — onyx-first dark palette
        onyx: {
          DEFAULT: '#0F0F0F',
          card: '#1A1A1A',
          raised: '#222222',
          line: '#2A2A2A',
        },
        brand: {
          DEFAULT: '#2859F7',
          deep: '#0945E6',
          50: '#EEF8FF',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36adf6',
          500: '#2859F7',
          600: '#0945E6',
          700: '#0840E1',
          800: '#064f84',
          900: '#0b426e',
          950: '#072a49',
        },
        aqua: {
          DEFAULT: '#8EFEFF',
        },
        gray: {
          1: '#454545',
          2: '#898E92',
          3: '#EBEBEB',
        },
        status: {
          red: '#EF4444',
          amber: '#F59E0B',
          green: '#22C55E',
          yellow: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Figtree', 'BT Beau Sans', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.05em',
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

export default config;
