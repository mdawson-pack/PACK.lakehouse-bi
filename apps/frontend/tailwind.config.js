/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar:  '#0f1117',
        main:     '#13161f',
        panel:    '#181b26',
        card:     '#1e2235',
        card2:    '#222638',
        accent:   '#4f7af8',
        accent2:  '#38c9a0',
        accent3:  '#f5a623',
        accent4:  '#e05c5c',
        muted:    '#7b82a0',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
