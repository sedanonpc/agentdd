/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        console: {
          black: '#00051a',
          blue: {
            DEFAULT: '#0033ff',
            bright: '#0066ff',
            dim: '#001a80',
            glow: '#4d9fff',
            dark: '#000a33'
          },
          green: '#00ff00',
          gray: {
            dark: '#000d2e',
            DEFAULT: '#001342',
            light: '#001e66',
            terminal: '#000f33'
          },
          white: {
            DEFAULT: '#ffffff',
            dim: 'rgba(255, 255, 255, 0.8)',
            muted: 'rgba(255, 255, 255, 0.6)'
          },
          grid: 'rgba(0, 102, 255, 0.1)'
        }
      },
      fontFamily: {
        mono: ['VT323', 'Monaco', 'Consolas', 'monospace'],
        display: ['Orbitron', 'Audiowide', 'monospace']
      },
      boxShadow: {
        'terminal': '0 0 10px rgba(0, 51, 255, 0.5), inset 0 0 10px rgba(0, 51, 255, 0.2)',
        'button': '0 0 5px #0033ff, inset 0 0 2px #0033ff',
        'glow': '0 0 15px rgba(0, 102, 255, 0.7)',
        'glow-red': '0 0 15px rgba(220, 38, 38, 0.7), inset 0 0 5px rgba(220, 38, 38, 0.3)',
        'input-glow-red': '0 0 8px rgba(220, 38, 38, 0.5)',
        'yellow-glow': '0 0 15px rgba(229, 255, 3, 0.5), inset 0 0 5px rgba(229, 255, 3, 0.2)'
      },
      backgroundImage: {
        'terminal-grid': 'linear-gradient(rgba(0, 102, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 102, 255, 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '20px 20px',
      },
      animation: {
        'terminal-flicker': 'flicker 0.15s infinite',
        'terminal-scan': 'terminal-scan 8s linear infinite',
        'pulse-blue': 'pulse-blue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.9' },
        },
        'terminal-scan': {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        'pulse-blue': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 15px rgba(0, 102, 255, 0.7)'
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 5px rgba(0, 102, 255, 0.5)'
          },
        },
        'fadeIn': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      borderWidth: {
        '1': '1px',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
};
