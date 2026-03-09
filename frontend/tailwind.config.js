/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        space: { 950: '#020817', 900: '#060e20', 800: '#0d1a30' },
      },
      keyframes: {
        twinkle: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        orbit: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        corona: {
          '0%,100%': { filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.8))' },
          '50%': { filter: 'drop-shadow(0 0 16px rgba(251,191,36,1))' },
        },
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
        shine: {
          '0%': { left: '-80%' },
          '100%': { left: '150%' },
        },
        'live-blink': {
          '0%,100%': { opacity: '1', boxShadow: '0 0 6px #22c55e' },
          '50%': { opacity: '0.3', boxShadow: 'none' },
        },
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        orbit: 'orbit 10s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        corona: 'corona 3s ease-in-out infinite',
        ripple: 'ripple 2s ease-out infinite',
        'live-blink': 'live-blink 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
