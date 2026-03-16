/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F3F0FF',
          100: '#E8E0FF',
          200: '#D1C2FE',
          300: '#B49BFE',
          400: '#9B7EFC',
          500: '#6C5CE7',
          600: '#5A4BD1',
          700: '#4834D4',
          800: '#3B22B8',
          900: '#2D1A8C',
        },
        surface: {
          50: '#F8F8FC',
          100: '#F0F0F8',
          200: '#E8E8F0',
          300: '#D8D8E4',
        },
        dark: {
          DEFAULT: '#2D3047',
          light: '#6B6B80',
          muted: '#9B9BB4',
        },
        accent: {
          pink: '#E84393',
          green: '#00B894',
          yellow: '#FDCB6E',
          red: '#FF6B6B',
          blue: '#74B9FF',
        },
      },
      boxShadow: {
        'card': '0 4px 16px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'purple': '0 8px 24px rgba(108, 92, 231, 0.2)',
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
