/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          50: 'rgba(255, 255, 255, 0.05)',
          100: 'rgba(255, 255, 255, 0.1)',
          200: 'rgba(255, 255, 255, 0.15)',
          300: 'rgba(255, 255, 255, 0.2)',
        },
        neon: {
          cyan: '#00f5ff',
          magenta: '#ff00ff',
          violet: '#8b5cf6',
          pink: '#ff0080',
        },
        tetromino: {
          I: '#00f5ff',
          O: '#ffeb3b',
          T: '#9c27b0',
          S: '#4caf50',
          Z: '#f44336',
          J: '#2196f3',
          L: '#ff9800',
        },
      },
      backgroundImage: {
        'holo-gradient': 'linear-gradient(135deg, rgba(0,245,255,0.3) 0%, rgba(255,0,255,0.3) 50%, rgba(139,92,246,0.3) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      boxShadow: {
        'glass': '0 0 50px rgba(0, 0, 0, 0.5)',
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.5), 0 0 40px rgba(0, 245, 255, 0.3)',
        'glow-magenta': '0 0 20px rgba(255, 0, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
        'inner-prism': 'inset 0 0 15px rgba(255, 255, 255, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.2s cubic-bezier(.36,.07,.19,.97) both',
        'particle-explode': 'particle-explode 0.8s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        'particle-explode': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--tx), var(--ty)) scale(0)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};